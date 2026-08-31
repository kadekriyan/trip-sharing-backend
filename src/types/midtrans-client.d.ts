declare module 'midtrans-client' {
  export interface ClientOptions {
    isProduction: boolean
    serverKey: string
    clientKey?: string
  }

  export interface TransactionResponse {
    token: string
    redirect_url: string
  }

  export class Snap {
    constructor(options: ClientOptions)
    createTransaction(payload: unknown): Promise<TransactionResponse>
  }

  export class CoreApi {
    constructor(options: ClientOptions)
  }

  const midtransClient: {
    Snap: typeof Snap
    CoreApi: typeof CoreApi
  }

  export default midtransClient
}

