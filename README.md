# 🤖 OpenAPI MCP Server

[![asciicast](https://asciinema.org/a/716593.svg)](https://asciinema.org/a/716593)

A command-line tool that transforms any OpenAPI service into a Model Context Protocol (MCP) server, enabling seamless integration with AI agents and tools that support the MCP specification.

> [!NOTE]
> This tool is still in early development stage.
> Roadmap [is here](https://github.com/users/JacerOmri/projects/1/views/2)

## What is Model Context Protocol (MCP)?

Model Context Protocol (MCP) is a standardized protocol for AI agents to interact with external tools and services. It provides a consistent way for AI models to discover, understand, and utilize various capabilities through a unified interface, making it easier to build AI-powered applications that can interact with multiple services.

## What is OpenAPI?

OpenAPI (formerly known as Swagger) is a specification for machine-readable interface files for describing, producing, consuming, and visualizing RESTful web services. It allows both humans and computers to discover and understand the capabilities of a service without needing to access the source code or additional documentation.

## About This Project

This middleware acts as a bridge between OpenAPI services and MCP clients. It:

1. Takes an OpenAPI specification file as input
2. Automatically generates an MCP-compliant server
3. Proxies incoming requests to the actual OpenAPI service
4. Translates between MCP and REST conventions

This enables any existing REST API with an OpenAPI specification to be immediately accessible to AI agents that understand MCP, without requiring any modifications to the original service.

## Installation

```sh
npm install -g openapi-mcp-proxy
```

## Usage

```sh
npx openapi-mcp-proxy --spec ./path/to/openapi.yml --target http://your-api.com --port 3000
```

### Options

- `-s, --spec <path>` (required): Path to your OpenAPI specification file
- `-t, --target <url>` (optional): Target URL of the API service (default: http://localhost:8080)
- `-p, --port <number>` (optional): Port to run the MCP server on (default: 3000)
- `-V, --version`: Display version number
- `-h, --help`: Display help for command

### Example

Start an MCP server for the Petstore API
```sh
npx openapi-mcp-proxy --spec resources/petstore.openapi.yml --target https://petstore.swagger.io/v2
```

### Testing

#### MCP Inspector
To test your MCP server, you can use the Model Context Protocol:

1. Install the MCP Inspector:
```sh
npx @modelcontextprotocol/inspector
```
2. Start your MCP server
3. Navigate to the inspector's UI and fill in the correct server path **ending with `/mcp`** like
`http://localhost:3000/mcp`
4. Now you can interact with your MCP server. The MCP Inspector will show you detailed information about the requests and responses.


#### with VS Code 

It's easier to use this with VS Code's built-in agent mode:

1. Open VS Code and enable agent mode:
   - Press `Cmd/Ctrl + Shift + P`
   - Type "Toggle GitHub Copilot Agent Mode"
   - Select "Enable"
2. Add your MCP server:
   - Press `Cmd/Ctrl + Shift + P`
   - Type "MCP: add Server"
   - type your MCP server URL like `http://localhost:3000/mcp` **ending with `/mcp`**
3. Your github copilot chat should pick up on the new tools it has!
4. Now you can interact with your MCP server through VS Code's agent interface. Try asking it "how many pets are available right now?"

for more information on how to use MCP servers with VS code, [see this](https://code.visualstudio.com/docs/copilot/chat/mcp-servers#_use-mcp-tools-in-agent-mode)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
Roadmap [is here](https://github.com/users/JacerOmri/projects/1/views/2)

## License

MIT
