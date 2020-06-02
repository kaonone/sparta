import { Bzz } from '@erebos/bzz';
import { autobind } from 'core-decorators';
import * as R from 'ramda';
import { Observable, from } from 'rxjs';

import { SWARM_GATEWAY_URL } from 'env';
import { memoize } from 'utils/decorators';

export class SwarmApi {
  bzz = new Bzz<any, any>({ url: SWARM_GATEWAY_URL });

  @autobind
  public async upload<T>(data: T): Promise<string> {
    const hash = await this.bzz.uploadData(data);
    return `0x${hash}`;
  }

  @memoize(R.identity)
  @autobind
  public read<T>(inputHash: string): Observable<T> {
    const hash = inputHash.startsWith('0x') ? inputHash.slice(2) : inputHash;
    return from(this.bzz.downloadData<T>(hash));
  }
}
