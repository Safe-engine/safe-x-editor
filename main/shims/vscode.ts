import path from 'path';

export class Uri {
  fsPath: string;

  constructor(fsPath: string) {
    this.fsPath = fsPath;
  }

  toString() {
    return this.fsPath;
  }

  static file(fsPath: string) {
    return new Uri(fsPath);
  }

  static joinPath(base: Uri, ...paths: string[]) {
    return new Uri(path.join(base.fsPath, ...paths));
  }
}

export class Position {
  constructor(public line: number, public character: number) {}
}

export const CompletionItemKind = {
  Value: 12,
};

export interface WebviewView {
  webview: {
    asWebviewUri(uri: Uri): Uri | string;
  };
}

export const workspace = {
  workspaceFolders: [{ uri: Uri.file(process.cwd()) }],
  getConfiguration(_section?: string) {
    return {
      get<T = unknown>(_key?: string): T | undefined {
        return undefined;
      },
    };
  },
};
