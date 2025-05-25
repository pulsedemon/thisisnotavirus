declare module "*.hbs" {
  const template: (context?: any) => string;
  export default template;
}
