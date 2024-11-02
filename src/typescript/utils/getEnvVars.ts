const currentAppId = kintone.app.getId();

export const getEnvConfig = <
    T extends {
        APP_ID: number;
        [key: string]: string | number;
    }[],
>(
    envConfig: T
): T[0] | undefined => {
    const config = envConfig.find((e) => e.APP_ID === currentAppId);
    return config;
};
