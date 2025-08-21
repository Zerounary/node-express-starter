const pino = require("pino");
// const dest = pino.destination("./logs.log");
// const logger = pino(dest);
const logger = pino();

const parseErrorStack = (error: Error): { file: string; line: string } => {
    if (!error.stack) return { file: 'unknown', line: 'unknown' };
    
    const lines = error.stack.split('\n');
    if (lines.length < 2) return { file: 'unknown', line: 'unknown' };

    // V8 stack trace format: "at functionName (filePath:line:column)"
    const traceLine = lines[1];
    const match = traceLine.match(/\((.*):(\d+):\d+\)/);
    if (match && match[1] && match[2]) {
        return { file: match[1], line: match[2] };
    }

    // Fallback for other formats: "at filePath:line:column"
    const fallbackMatch = traceLine.match(/at (.*):(\d+):\d+/);
    if (fallbackMatch && fallbackMatch[1] && fallbackMatch[2]) {
        return { file: fallbackMatch[1].trim(), line: fallbackMatch[2] };
    }

    return { file: 'unknown', line: 'unknown' };
};

export const logInfo = (msg) => {
    logger.info(msg)
}

export const logError = (error: Error) => {
    const { file, line } = parseErrorStack(error);
    console.error(`[ERROR] ${new Date().toISOString()}`);
    console.error(`Message: ${error.message}`);
    console.error(`Location: ${file}:${line}`);
    console.error("Stack:", error.stack);
};

export default logger;