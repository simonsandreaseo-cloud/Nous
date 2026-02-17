use headless_chrome::{Browser, LaunchOptions};
use scraper::{Html, Selector};
use tauri::{AppHandle, Emitter};

#[derive(serde::Serialize, Clone)]
pub struct HeaderItem {
    pub tag: String,
    pub text: String,
}

#[derive(serde::Serialize)]
pub struct CrawlResult {
    pub url: String,
    pub title: String,
    pub content: String,
    pub html_structure: String,
    pub dom_health_score: u8,
    pub sentiment_label: String,
    pub readability_score: f64,
    pub keywords: String,
    pub headers: Vec<HeaderItem>,
}

#[derive(serde::Serialize)]
pub struct SerpResult {
    pub rank: u32,
    pub title: String,
    pub url: String,
    pub description: String,
}

pub fn crawl_url(app: AppHandle, url: &str, proxy: Option<&str>) -> Result<CrawlResult, String> {
    // Notify UI that we are starting a navigation
    let _ = app.emit("scraping-status", serde_json::json!({
        "url": url,
        "status": "navigating",
        "message": format!("Navigating to {}", url)
    }));

    let mut args = Vec::new();
    if let Some(p) = proxy {
        args.push(std::ffi::OsStr::new("--proxy-server"));
        args.push(std::ffi::OsStr::new(p));
    }

    let options = LaunchOptions {
        headless: true,
        args: args.iter().map(|s| *s).collect(),
        ..Default::default()
    };
    
    let browser = Browser::new(options).map_err(|e| e.to_string())?;
    let tab = browser.new_tab().map_err(|e| e.to_string())?;

    log::info!("Navigating to: {}", url);
    tab.navigate_to(url).map_err(|e| e.to_string())?;
    tab.wait_until_navigated().map_err(|e| e.to_string())?;
    
    // Wait for JS to render (basic wait)
    std::thread::sleep(std::time::Duration::from_secs(2));

    let content = tab.get_content().map_err(|e| e.to_string())?;
    let title = tab.get_title().map_err(|e| e.to_string())?;

    // Parse HTML for structure analysis
    let document = Html::parse_document(&content);
    let selector_body = Selector::parse("body").unwrap();
    
    // Extract text
    let body_text = document.select(&selector_body).next()
        .map(|e| e.text().collect::<Vec<_>>().join(" "))
        .unwrap_or_default();

    // DOM Analysis Logic
    let mut score = 100;
    
    // Check for H1
    let h1_selector = Selector::parse("h1").unwrap();
    if document.select(&h1_selector).count() == 0 {
        score -= 20; // Critical SEO failure
    } else if document.select(&h1_selector).count() > 1 {
        score -= 10; // Multiple H1s
    }

    // Check for semantic tags
    let semantic_tags = ["article", "section", "nav", "aside", "main", "header", "footer"];
    let mut semantic_count = 0;
    for tag in semantic_tags {
        let selector = Selector::parse(tag).unwrap();
        if document.select(&selector).count() > 0 {
            semantic_count += 1;
        }
    }
    
    if semantic_count < 3 {
        score -= 15; // Poor semantic structure
    }

    // Check for alt tags on images
    let img_selector = Selector::parse("img").unwrap();
    let imgs = document.select(&img_selector);
    let mut missing_alt = 0;
    let mut total_imgs = 0;
    for img in imgs {
        total_imgs += 1;
        if img.value().attr("alt").is_none() {
            missing_alt += 1;
        }
    }

    if total_imgs > 0 {
        let alt_ratio = missing_alt as f32 / total_imgs as f32;
        if alt_ratio > 0.5 {
            score -= 10;
        }
    }

    // Extract headers (H1-H4)
    let header_selector = Selector::parse("h1, h2, h3, h4").unwrap();
    let headers: Vec<HeaderItem> = document.select(&header_selector)
        .map(|e| HeaderItem {
            tag: e.value().name().to_string(),
            text: e.text().collect::<Vec<_>>().join(" ").trim().to_string(),
        })
        .filter(|h| !h.text.is_empty())
        .collect();

    // Run Intelligence Analysis
    let intelligence = crate::intelligence::analyze_content(&content);

    Ok(CrawlResult {
        url: url.to_string(),
        title,
        content: body_text,
        html_structure: format!("Semantic Tags Found: {}/{}", semantic_count, semantic_tags.len()),
        dom_health_score: score.clamp(0, 100),
        sentiment_label: intelligence.sentiment_label,
        readability_score: intelligence.readability_score,
        keywords: intelligence.keywords,
        headers,
    })
}

#[tauri::command]
pub async fn start_crawl(app: AppHandle, url: String, proxy: Option<&str>) -> Result<CrawlResult, String> {
    let proxy_owned = proxy.map(|s| s.to_string());
    // Run blocking task in a separate thread
    let result = tauri::async_runtime::spawn_blocking(move || {
        crawl_url(app, &url, proxy_owned.as_deref())
    }).await.map_err(|e| e.to_string())?;

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn scrape_google_serp(app: AppHandle, keyword: String) -> Result<Vec<SerpResult>, String> {
    let _ = app.emit("scraping-status", serde_json::json!({
        "url": format!("Google Search: {}", keyword),
        "status": "searching",
        "message": format!("Searching Google for: {}", keyword)
    }));

    let result = tauri::async_runtime::spawn_blocking(move || {
        let browser = Browser::default().map_err(|e| e.to_string())?;
        let tab = browser.new_tab().map_err(|e| e.to_string())?;

        let url = format!("https://www.google.com/search?q={}", percent_encoding::utf8_percent_encode(&keyword, percent_encoding::NON_ALPHANUMERIC));
        
        tab.navigate_to(&url).map_err(|e| e.to_string())?;
        tab.wait_until_navigated().map_err(|e| e.to_string())?;
        
        // Wait for results to load
        std::thread::sleep(std::time::Duration::from_secs(2));

        let content = tab.get_content().map_err(|e| e.to_string())?;
        let document = Html::parse_document(&content);
        
        // Google Orgánico selector (Usually 'div.g' or similar)
        let result_selector = Selector::parse("div.g").unwrap();
        let title_selector = Selector::parse("h3").unwrap();
        let link_selector = Selector::parse("a").unwrap();
        let desc_selector = Selector::parse("div[style*='-webkit-line-clamp']").unwrap();

        let mut results = Vec::new();
        let mut rank = 1;

        for element in document.select(&result_selector) {
            let title = element.select(&title_selector).next()
                .map(|e| e.text().collect::<Vec<_>>().join(""))
                .unwrap_or_default();

            let url = element.select(&link_selector).next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or_default();

            let description = element.select(&desc_selector).next()
                .map(|e| e.text().collect::<Vec<_>>().join(""))
                .unwrap_or_default();

            if !title.is_empty() && url.starts_with("http") {
                results.push(SerpResult {
                    rank,
                    title,
                    url: url.to_string(),
                    description,
                });
                rank += 1;
            }
            
            if results.len() >= 10 { break; }
        }

        Ok(results)
    }).await.map_err(|e| e.to_string())?;

    result
}
