import { developmentLogger } from "./dev.logger.js";
import { productionLogger } from "./prod.logger.js";

let logger;

if (process.env.NODE_ENV === 'development') {
    logger = developmentLogger();
}
if (process.env.NODE_ENV === 'production') {
    logger = productionLogger();
}

export default logger;