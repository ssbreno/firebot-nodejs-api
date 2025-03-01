export interface BaseUseCase<TInput = void, TOutput = void> {
  execute(input: TInput): Promise<TOutput>
}
