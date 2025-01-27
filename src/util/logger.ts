 
 

import util from 'util';
import 'winston-mongodb';
import { createLogger, format, transports } from 'winston';
import path from 'path';
import { red, blue, yellow, green, magenta } from 'colorette';
import * as sourceMapSupport from 'source-map-support';
import config from '../config/config';
import { EApplicationEnvironment } from '../constant/application';
import { ConsoleTransportInstance, FileTransportInstance } from 'winston/lib/winston/transports';
import { MongoDBTransportInstance } from 'winston-mongodb';

// Source Map Support
sourceMapSupport.install();

const colorizeLevel = (level: string) => {
    switch (level) {
        case 'ERROR': return red(level);
        case 'INFO': return blue(level);
        case 'WARN': return yellow(level);
        default: return level;
    }
};

const consoleLogFormat = format.printf((info) => {
    const { level, message, timestamp, meta = {} } = info;

    const customLevel = colorizeLevel(level.toUpperCase());
    const customTimestamp = green(timestamp as string);
    const customMeta = util.inspect(meta, { showHidden: false, depth: null, colors: true });

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `${customLevel} [${customTimestamp}] ${message}\n${magenta('META')} ${customMeta}\n`;
});

const consoleTransport = (): Array<ConsoleTransportInstance> => {
    if (config.ENV === EApplicationEnvironment.DEVELOPMENT) {
        return [
            new transports.Console({
                level: 'info',
                format: format.combine(format.timestamp(), consoleLogFormat)
            })
        ];
    }
    return [];
};

const fileLogFormat = format.printf((info) => {
    const { level, message, timestamp, meta = {} } = info;

    const logMeta: Record<string, unknown> = {};

    if (meta && typeof meta === 'object') {
        for (const [key, value] of Object.entries(meta)) {
            if (value instanceof Error) {
                logMeta[key] = {
                    name: value.name,
                    message: value.message,
                    trace: value.stack || ''
                };
            } else {
                logMeta[key] = value;
            }
        }
    }

    const logData = {
        level: level.toUpperCase(),
        message,
        timestamp,
        meta: logMeta
    };

    return JSON.stringify(logData, null, 4);
});

const FileTransport = (): Array<FileTransportInstance> => {
    const logFilePath = path.resolve(__dirname, '../../logs', `${config.ENV}.log`);
    return [
        new transports.File({
            filename: logFilePath,
            level: 'info',
            format: format.combine(format.timestamp(), fileLogFormat)
        })
    ];
};

const MongodbTransport = (): Array<MongoDBTransportInstance> => {
    if (!config.DATABASE_URL) {
        return [];
    }

    
    return [
       
        new transports.MongoDB({
            level: 'info',
            db: config.DATABASE_URL,
            metaKey: 'meta',
            expireAfterSeconds: 3600 * 24 * 30,
            options: { useUnifiedTopology: true },
            collection: 'application-logs'
        })
    ];
};

const logger = createLogger({
    defaultMeta: { meta: {} },
     
    
    transports: [...FileTransport(), ...MongodbTransport(), ...consoleTransport()]
});

export default logger;
