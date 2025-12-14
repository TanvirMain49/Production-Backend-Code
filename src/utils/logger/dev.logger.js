import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;

const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});

const developmentLogger = () => {
    return winston.createLogger({
        level: "debug",
        format: combine(
            timestamp({ format: "YYYY-MM-DD" }),
            colorize(),
            myFormat
        ),
    transports: [
            new winston.transports.Console(),
        ],
    });
};

export { developmentLogger };
