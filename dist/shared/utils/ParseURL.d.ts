import { IEnv } from '../../interfaces/IEnv';
export declare class ParseURL {
    static findSearchParam(search: string, keyToFind: string): string | null;
    static parseDBUrl(url: string): IEnv | null;
}
