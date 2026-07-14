export type ApiSuccess<T> = {
  success: true
  data: T
  meta?: unknown
  message?: string
}

export type ApiFailure = {
  success: false
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure
