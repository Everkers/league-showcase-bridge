import axios from 'axios';
import { ipcMain, WebContents } from 'electron';
import https from 'https';
import LCUConnector from 'lcu-connector';
import requestedData from '../constants';
import DataFormater from './dataFormater';

class Aggregation {
  private summonerId: string = '';

  private request: { auth: string; url: string } = { auth: '', url: '' };

  connector = new LCUConnector();

  protocol: URL;

  webContents: WebContents | undefined;

  constructor(webContents: WebContents | undefined, protocol: URL) {
    this.webContents = webContents;
    this.protocol = protocol;
  }

  private async getSommonerProfile() {
    const profile = await this.call('/lol-summoner/v1/current-summoner');
    this.summonerId = profile.summonerId;
    return profile.data;
  }

  private async aggregate() {
    this.webContents?.send('status-update', 'starting');
    const res = await Promise.all(
      requestedData.map(async (item, i) => {
        const progress = Math.abs(((i + 1) / requestedData.length) * 100);
        this.webContents?.send('opperation-progress', progress);
        const data = await this.call(item.endpoint)
          .catch((err) => {
            throw err;
          })
          .then((x) => ({ [item.key]: x }));
        return data;
      })
    ).catch((err) => {
      console.error(err);
      this.webContents?.send('status-update', 'error');
    });
    if (res) {
      const formatedBody = res.reduce(
        (obj, item) =>
          Object.assign(obj, {
            [Object.keys(item)[0]]: Object.values(item)[0],
          }),
        {}
      );
      const dataFormater = new DataFormater(formatedBody, [
        {
          championsWithSkins: [
            'alias',
            'active',
            'spells',
            'passive',
            'roles',
            'tacticalInfo',
            'filteredSkins',
            'freeToPlay',
            'stingerSfxPath',
            'banVoPath',
            'disabledQueues',
            'rankedPlayEnabled',
            'ownership',
          ],
        },
      ]);
      const formatedData = await dataFormater.formatData();
      const { host: token } = this.protocol;
      await axios
        .post('http://localhost:3000/api/accounts/add', formatedData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        .catch((err) => {
          this.webContents?.send('status-update', 'error');
          throw err;
        });
      this.webContents?.send('status-update', 'done');
    }
  }

  private formatEndpoint(endpoint: string) {
    if (endpoint.includes('{summonerId}'))
      return endpoint.replace('{summonerId}', this.summonerId);
    return endpoint;
  }

  private async call(endpoint: string, data?: string) {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    try {
      const res = await axios(
        `${this.request.url}${this.formatEndpoint(endpoint)}`,
        {
          method: 'GET',
          httpsAgent: agent,
          data,
          headers: {
            Accept: 'application/json',
            Authorization: this.request.auth,
          },
        }
      );
      return res.data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  private async validateToken() {
    try {
      const { host: token } = this.protocol;
      const { data } = await axios.get(
        `http://localhost:3000/api/users/validate-token/${token}`
      );
      return data.isValid;
    } catch (err) {
      this.webContents?.send('status-update', 'error');
      throw err;
    }
  }

  async retry() {
    const isValidToken = await this.validateToken();
    if (isValidToken) {
      this.connector.stop();
      this.connector.start();
    }
  }

  async init() {
    // listeners
    ipcMain.on('fetch-data', () => this.retry());

    const isValidToken = await this.validateToken();
    this.connector.on('connect', async (data) => {
      this.request = {
        url: `${data.protocol}://${data.address}:${data.port}`,
        auth: `Basic ${Buffer.from(
          `${data.username}:${data.password}`
        ).toString('base64')}`,
      };
      await this.getSommonerProfile();
      await this.aggregate();
    });
    if (isValidToken) this.connector.start();
    else this.webContents?.send('status-update', 'invalidToken');
  }
}

export default Aggregation;
