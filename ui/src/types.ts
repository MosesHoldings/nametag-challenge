export enum TypeOfData {
    Text = 1,
    Url = 2
}

export interface DataSourceResponse {
    data: string;
    typeOfData: TypeOfData;
    lastUpdated: string;
    title: string;
    updateFrequency: number;
}

export interface DataSource {
    name: string;
    description: string;
    isNew: boolean;
}
  
export interface Config {
    updateFrequency: Record<string, number>;
    pluginsEnabled: string[];
    autoUpdateEnabled: boolean;
    autoUpdateFrequency: number;
}