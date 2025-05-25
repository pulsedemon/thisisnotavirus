declare module "*.hbs" {
  const template: (context?: Record<string, unknown>) => string;
  export default template;
}
