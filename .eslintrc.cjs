module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react-hooks'],
  rules: {
    // pega useEffect com deps faltando/erradas — warn, não error: o objetivo é
    // acusar e forçar documentar a intenção (comentário/disable explícito), não
    // travar o build por causa de mount-only effects já deliberados no código.
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'no-unused-vars': 'warn',
    // JSX de componente customizado (<Foo/>) já é pego pelo no-undef padrão do
    // eslint:recommended — não precisa do eslint-plugin-react inteiro só por isso.
  },
  ignorePatterns: ['dist/', 'dev-dist/', 'node_modules/', 'supabase/functions/**'],
}
