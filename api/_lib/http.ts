export type ApiRequest = {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
};

export type ApiResponse = {
  setHeader?: (name: string, value: string | string[]) => void;
  status?: (code: number) => { json: (body: any) => void; end: () => void };
  statusCode?: number;
  end?: (body?: string) => void;
};

export function sendJson(res: ApiResponse, statusCode: number, body: any) {
  if (typeof res.end === 'function') {
    res.statusCode = statusCode;
    res.setHeader?.('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(body));
  }

  return res.status?.(statusCode).json(body);
}

export function sendNoContent(res: ApiResponse, statusCode = 204) {
  if (typeof res.end === 'function') {
    res.statusCode = statusCode;
    return res.end();
  }

  return res.status?.(statusCode).end();
}
