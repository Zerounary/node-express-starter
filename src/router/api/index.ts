export const ok = (data) => {
    return {
        code: 1,
        data
    }
}

export const fail = (msg, code = 0) => {
    return {
        code,
        msg
    }
}

export enum ERROR_CODE {
    COMMON = -1
}