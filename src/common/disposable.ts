export type Disposer = () => void;

export interface Disposable {
  dispose(): void;
}
