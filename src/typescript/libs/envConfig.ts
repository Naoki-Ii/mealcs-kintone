import * as ENV_CONFIG from '../../../config/dev.json';

export const getEnvGlobalConfig = () => {
    return JSON.parse(
        process.env.KINTONE_OV_CONFIG ?? '{}'
    ) as typeof ENV_CONFIG;
};
