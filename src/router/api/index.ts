export const ok = (data) => {
    return {
        code: 0,
        data
    }
}

export const fail = (error, code = 500) => {
    return {
        code,
        error
    }
}

export enum ERROR_CODE {
    COMMON = -1
}