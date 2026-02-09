# PlayScrapper - UML Architecture Diagrams

## 1. Component Architecture (Component Diagram)

```mermaid
graph TB
    CLI[CLI Entry Point<br/>cli.ts] --> Config[Config Parser<br/>config.ts]
    CLI --> Logger[Logger<br/>logger.ts]
    CLI --> ErrorHandler[ErrorHandler<br/>error-handler.ts]
    CLI --> Browser[Browser<br/>browser.ts]
    CLI --> Crawler[Crawler<br/>crawler.ts]
    CLI --> Downloader[Downloader<br/>downloader.ts]
    CLI --> Processor[Processor<br/>processor.ts]
    CLI --> FileOrganizer[FileOrganizer<br/>file-organizer.ts]

    Config --> Types[Types<br/>types.ts]
    Logger --> Types
    ErrorHandler --> Types
    ErrorHandler --> Logger
    Browser --> Types
    Crawler --> Types
    Crawler --> Browser
    Crawler --> ErrorHandler
    Crawler --> Logger
    Downloader --> Types
    Downloader --> FileOrganizer
    Processor --> Types
    FileOrganizer --> Types

    CLI --> Constants[Constants<br/>constants.ts]

    style CLI fill:#e1f5ff
    style Types fill:#fff4e1
    style Constants fill:#fff4e1
```

## 2. Class Diagram (Main Interfaces)

```mermaid
classDiagram
    class IConfig {
        +string targetUrl
        +number depth
        +string outputDir
    }

    class IPageData {
        +string url
        +string html
        +IAsset[] assets
    }

    class IAsset {
        +string url
        +AssetType type
    }

    class IBrowser {
        <<interface>>
        +launch() Promise~void~
        +scrapePage(url: string) Promise~IPageData~
        +close() Promise~void~
    }

    class IDownloader {
        <<interface>>
        +download(url: string) Promise~Buffer~
        +getLocalPath(url: string) string
    }

    class IProcessor {
        <<interface>>
        +rewriteUrls(html: string, assetMap: Map~string, string~, baseUrl: string) string
        +removeAnalytics(html: string) string
        +mockForms(html: string) string
    }

    class IFileOrganizer {
        <<interface>>
        +mapUrlToPath(url: string, baseUrl: string) string
        +organize(pages: Map~string, string~, outputDir: string, baseUrl: string) Promise~void~
    }

    class ILogger {
        <<interface>>
        +info(message: string) Promise~void~
        +error(message: string, error?: Error) Promise~void~
        +warn(message: string) Promise~void~
    }

    class IErrorHandler {
        <<interface>>
        +handleTimeout(url: string, error: Error) Promise~boolean~
        +handle404(url: string) Promise~void~
        +handleNetworkError(url: string, error: Error) Promise~void~
        +saveProgress(visitedUrls: Set~string~, currentPage: string, outputPath: string) Promise~void~
        +withRetry~T~(url: string, operation: () => Promise~T~) Promise~T~
    }

    class PlaywrightBrowser {
        -browser: Browser
        -page: Page
        +launch() Promise~void~
        +scrapePage(url: string) Promise~IPageData~
        +close() Promise~void~
    }

    class Crawler {
        -browser: IBrowser
        -maxDepth: number
        +crawl(startUrl: string, visitedUrls?: Set~string~, errorHandler?: IErrorHandler, logger?: ILogger) Promise~IPageData[]~
    }

    class Downloader {
        -outputDir: string
        -organizer: IFileOrganizer
        +download(url: string) Promise~Buffer~
        +getLocalPath(url: string) string
    }

    class Processor {
        +rewriteUrls(html: string, assetMap: Map~string, string~, baseUrl: string) string
        +removeAnalytics(html: string) string
        +mockForms(html: string) string
    }

    class FileOrganizer {
        +mapUrlToPath(url: string, baseUrl: string) string
        +organize(pages: Map~string, string~, outputDir: string, baseUrl: string) Promise~void~
    }

    class Logger {
        -logFile: string
        -verbose: boolean
        +info(message: string) Promise~void~
        +error(message: string, error?: Error) Promise~void~
        +warn(message: string) Promise~void~
    }

    class ErrorHandler {
        -logger: ILogger
        -maxRetries: number
        -retryDelay: number
        +handleTimeout(url: string, error: Error) Promise~boolean~
        +handle404(url: string) Promise~void~
        +handleNetworkError(url: string, error: Error) Promise~void~
        +saveProgress(visitedUrls: Set~string~, currentPage: string, outputPath: string) Promise~void~
        +withRetry~T~(url: string, operation: () => Promise~T~) Promise~T~
    }

    PlaywrightBrowser ..|> IBrowser
    Crawler ..|> IBrowser
    Downloader ..|> IDownloader
    Processor ..|> IProcessor
    FileOrganizer ..|> IFileOrganizer
    Logger ..|> ILogger
    ErrorHandler ..|> IErrorHandler
    ErrorHandler ..|> ILogger
```

## 3. Sequence Diagram - CLI Workflow

```mermaid
sequenceDiagram
    participant User
    participant CLI as CLI (cli.ts)
    participant Config as Config Parser
    participant Logger as Logger
    participant ErrorHandler as ErrorHandler
    participant Browser as Browser
    participant Crawler as Crawler
    participant Downloader as Downloader
    participant Processor as Processor
    participant Organizer as FileOrganizer

    User->>CLI: Execute with --url, --depth, --output
    CLI->>Config: parseConfig(options)
    Config-->>CLI: IConfig

    CLI->>Logger: new Logger(logFile, verbose)
    CLI->>ErrorHandler: new ErrorHandler(logger, retries, delay)
    CLI->>Organizer: new FileOrganizer()
    CLI->>Processor: new Processor()
    CLI->>Downloader: new Downloader(outputDir, organizer)

    CLI->>Browser: new PlaywrightBrowser()
    CLI->>Browser: launch()
    Browser-->>CLI: Browser initialized

    CLI->>Crawler: new Crawler(browser, depth)
    CLI->>Crawler: crawl(startUrl, visitedUrls, errorHandler, logger)
    loop For each page
        Crawler->>Browser: scrapePage(url)
        Browser-->>Crawler: IPageData
        Crawler-->>CLI: IPageData[]
    end

    loop For each asset
        CLI->>Downloader: download(assetUrl)
        Downloader-->>CLI: Buffer
    end

    CLI->>Processor: rewriteUrls(html, assetMap, baseUrl)
    CLI->>Processor: removeAnalytics(html)

    CLI->>Organizer: organize(pages, outputDir, baseUrl)

    CLI->>Browser: close()
    CLI-->>User: Scrape complete
```

## 4. Data Flow Diagram

```mermaid
graph LR
    A[User Input<br/>CLI Flags] --> B[Config Parser<br/>Zod Validation]
    B --> C[Logger<br/>Error Logging]
    B --> D[Browser<br/>Playwright]
    D --> E[Crawler<br/>Page Scraping]
    E --> F[Processor<br/>HTML Processing]
    E --> G[Downloader<br/>Asset Download]
    F --> H[FileOrganizer<br/>File Structure]
    G --> H
    C --> I[ErrorHandler<br/>Retry Logic]
    I --> E
    I --> G

    style A fill:#e1f5ff
    style I fill:#ffe1e1
    style H fill:#e1ffe1
```

## 5. Module Dependencies

```mermaid
graph TD
    CLI[cli.ts] --> Config[config.ts]
    CLI --> Browser[browser.ts]
    CLI --> Crawler[crawler.ts]
    CLI --> Downloader[downloader.ts]
    CLI --> FileOrganizer[file-organizer.ts]
    CLI --> Processor[processor.ts]
    CLI --> Logger[logger.ts]
    CLI --> ErrorHandler[error-handler.ts]
    CLI --> Constants[constants.ts]

    Config --> Types[types.ts]
    Browser --> Types
    Crawler --> Types
    Crawler --> Browser
    Downloader --> Types
    Downloader --> FileOrganizer
    Processor --> Types
    FileOrganizer --> Types
    Logger --> Types
    ErrorHandler --> Types
    ErrorHandler --> Logger

    Browser --> Playwright[playwright]
    Processor --> Cheerio[cheerio]
    Config --> Zod[zod]

    style CLI fill:#ff9999
    style Types fill:#99ff99
    style Playwright fill:#9999ff
    style Cheerio fill:#9999ff
    style Zod fill:#9999ff
```
