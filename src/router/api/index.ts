export const ok = (data) => {
    return {
        code: 1,
        data
    }
}

export const fail = (code, msg) => {
    return {
        code: 0,
        msg
    }
}

export enum ERROR_CODE {
    COMMON = -1
}