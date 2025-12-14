import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const { combine, timestamp, printf } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} | ${level.toUpperCase()} | ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta) : ""
    }`;
});

const productionLogger = () => {
    return winston.createLogger({
        level: "info",
        format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat
        ),
        transports: [
        new DailyRotateFile({
            filename: "logs/app-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            maxSize: "20m",
            maxFiles: "14d",
        }),
        ],
    });
};

export { productionLogger };
