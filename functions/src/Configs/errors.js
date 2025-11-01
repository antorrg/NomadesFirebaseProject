
export const throwError = (message, status) => {
    const error = new Error(message)
    error.status = status ?? 500
    throw error
}