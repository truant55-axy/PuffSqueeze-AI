declare const tracery: {
  createGrammar(rules: Record<string, string | string[]>): {
    flatten(rule: string): string;
  };
};
export default tracery;
