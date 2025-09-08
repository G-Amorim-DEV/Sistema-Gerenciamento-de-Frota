```markdown
# 🚗 Sistema de Gestão de Frota (SaaS)

Um sistema completo de gerenciamento de frota de veículos com interface moderna, recursos avançados e simulação em tempo real.

---

## 🌟 Características Principais

- **Dashboard Interativo**: Visualização em tempo real de todos os veículos  
- **Categorias Diversas**: Terrestres, aéreos, ferroviários, marítimos e militares  
- **Sistema de Notificações**: Alertas para eventos importantes  
- **Mapa em Tempo Real**: Acompanhamento visual da localização dos veículos  
- **Modo Robô**: Automação de gestão da frota  
- **Estatísticas Detalhadas**: Métricas e analytics completos  
- **Tema Escuro/Claro**: Interface adaptável às preferências do usuário  
- **Design Responsivo**: Funciona em desktop e dispositivos móveis

---

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura semântica e acessível  
- **CSS3**: Design moderno com variáveis CSS e tema escuro/claro  
- **JavaScript ES6+**: Lógica de aplicação com módulos e classes  
- **LocalStorage**: Persistência de dados local  
- **Web APIs**: Utilização de APIs modernas do navegador

---

## 📦 Estrutura do Projeto

```

frota-saas/
├── index.html        # Página principal
├── css/
│   └── style.css     # Estilos principais
├── js/
│   └── script.js     # Lógica da aplicação
├── frota.json        # Dados iniciais da frota
└── README.md         # Documentação

````

---

## 🚀 Funcionalidades

### Gestão de Veículos
- ✅ Adicionar/editar/remover veículos  
- ✅ Categorização por tipo (terrestre, aéreo, etc.)  
- ✅ Filtros avançados (status, combustível, conexão)  
- ✅ Sistema de favoritos  
- ✅ Busca em tempo real

### Monitoramento em Tempo Real
- ✅ Status de atividade (ligado/desligado)  
- ✅ Controle de movimento  
- ✅ Níveis de combustível  
- ✅ Sistema de conexão  
- ✅ Status de segurança

### Mapa Interativo
- ✅ Visualização da localização dos veículos  
- ✅ Acompanhamento em tempo real  
- ✅ Modo "seguir veículo"  
- ✅ Marcadores personalizados por categoria

### Automação
- ✅ Modo robô para gestão automática  
- ✅ Ações especiais por tipo de veículo  
- ✅ Sistema de notificações automáticas

### Analytics e Relatórios
- ✅ Estatísticas gerais da frota  
- ✅ Relatórios por categoria  
- ✅ Histórico de velocidade  
- ✅ Log de eventos do sistema

### Personalização
- ✅ Tema claro/escuro  
- ✅ Configurações de idioma  
- ✅ Preferências de notificação

---

## 🎮 Como Usar

### Controles Principais
- **Adicionar veículo**: Botão "+ Adicionar" ou tecla `N`  
- **Ativar/desativar robô**: Botão 🤖 ou tecla `R`  
- **Abrir mapa**: Botão 🗺️ ou tecla `M`  
- **Estatísticas**: Tecla `S`  
- **Log do sistema**: Tecla `L`  
- **Manual**: Tecla `H`

### Gestão de Veículos
1. Clique em "Adicionar" para criar um novo veículo.  
2. Preencha os detalhes (nome, categoria, capacidade, etc.).  
3. Use os botões de ação para controlar cada veículo:
   - ⚪ Ligar/Desligar  
   - ▶️ Parar/Mover  
   - ⭐ Favoritar  
   - 🔍 Detalhes  
   - ⚡ Ações Especiais

### Filtros e Busca
- Use a barra de busca para encontrar veículos específicos.  
- Aplique filtros por status (ativos, em movimento, etc.).  
- Ordene por combustível ou nome.  
- Filtre por categoria usando a sidebar.

---

## 🔧 Instalação e Configuração

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
````

2. Abra o arquivo `index.html` em um navegador moderno.

3. (Opcional) Edite `frota.json` para personalizar os veículos iniciais.

---

## 📊 Estrutura de Dados

**Veículo**

```json
{
  "id": 1,
  "nome": "Nome do Veículo",
  "categoria": "terrestres", // 'terrestres', 'aereos', etc.
  "capacidade": "2 toneladas",
  "capacidadeNum": 2000,
  "combustivel": "diesel",
  "velocidadeMaxima": 120,
  "emoji": "🚚",
  "ativo": true,
  "movendo": false,
  "conectado": true,
  "seguro": true,
  "combustivelRestante": 75, // 0-100
  "x": 34, // Posição no mapa (0-100)
  "y": 68, // Posição no mapa (0-100)
  "acoesEspeciais": ["alarme", "reboque"],
  "motorista": "João Silva"
}
```

---

## 🌐 Navegadores Suportados

* Chrome 70+
* Firefox 65+
* Safari 12+
* Edge 79+

---

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:

* Desktop (1200px+)
* Tablet (768px-1199px)
* Mobile (320px-767px)

---

## 🔮 Próximas Melhorias

* Integração com API de mapas real
* Sistema de usuários e permissões
* Relatórios em PDF/Excel
* API REST para integração
* Sistema de rotas e otimização
* Alertas por e-mail/SMS
* App móvel nativo

---

## 🤝 Como Contribuir

1. Faça o fork do projeto.
2. Crie uma branch para sua feature:

   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit suas mudanças:

   ```bash
   git commit -m "Add some AmazingFeature"
   ```
4. Push para a branch:

   ```bash
   git push origin feature/AmazingFeature
   ```
5. Abra um Pull Request.

---

## 👨‍💻 Autor

Desenvolvido por **Guilherme Amorim - Amorim\_Dev**
Email: [guilhermeamorimrochalima@gmail.com](mailto:guilhermeamorimrochalima@gmail.com)

---

## 🎨 Design System

**Cores Principais**

* `--accent`: Azul principal (`#2563eb`)
* `--success`: Verde para sucesso (`#10b981`)
* `--warning`: Amarelo para alertas (`#f59e0b`)
* `--danger`: Vermelho para erros (`#ef4444`)
* `--muted`: Texto secundário (`#6b7280`)

**Tipografia**

* Fonte Principal: Inter
* Tamanhos: Sistema escalável baseado em `rem`
* Pesos: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

---

## 🔍 Acessibilidade

* Navegação por teclado completa
* Leitores de tela compatíveis
* Contrastes adequados
* Labels ARIA para elementos interativos
* Foco visível em todos os elementos interativos

---

## 📈 Performance

* Carregamento otimizado de recursos
* Renderização eficiente de listas grandes
* Atualizações em tempo real sem travamentos
* Armazenamento local para sessões rápidas

> **Nota:** Este é um projeto demonstrativo para portfólio. Em ambiente de produção, recomenda-se implementar autenticação, validação de dados adicional e persistência em servidor.

---

```
```
