use readability::extractor;
use vader_sentiment::SentimentIntensityAnalyzer;
use std::io::Cursor;

#[derive(serde::Serialize)]
pub struct IntelligenceResult {
    pub readability_score: f64, 
    pub sentiment_score: f64, // Compound score
    pub sentiment_label: String,
    pub extracted_text: String,
    pub keywords: String,
}

pub fn analyze_content(html_content: &str) -> IntelligenceResult {
    // 1. Extract main content using readability
    // readability crate expects a "Read" trait object.
    let mut cursor = Cursor::new(html_content);
    // Ideally we pass the URL too, but for now let's just pass dummy url if needed or just content.
    // extractor::extract expects (&mut R, &Url).
    let url = url::Url::parse("https://example.com").unwrap();
    
    let extracted = extractor::extract(&mut cursor, &url).ok();
    let text = extracted.map(|p| p.text).unwrap_or_default();

    // 2. Sentiment Analysis
    let analyzer = SentimentIntensityAnalyzer::new();
    let sentiment_scores = analyzer.polarity_scores(&text);
    let compound = sentiment_scores["compound"];

    let label = if compound >= 0.05 {
        "Positive"
    } else if compound <= -0.05 {
        "Negative"
    } else {
        "Neutral"
    };

    // 3. Simple Readability Metric (Automated Readability Index - ARI)
    // 4.71 * (characters/words) + 0.5 * (words/sentences) - 21.43
    let words: Vec<&str> = text.split_whitespace().collect();
    let word_count = words.len() as f64;
    
    let char_count = text.chars().filter(|c| c.is_alphanumeric()).count() as f64;
    
    let sentence_count = text.split(|c| c == '.' || c == '!' || c == '?').filter(|s| !s.trim().is_empty()).count() as f64;

    let ari = if word_count > 0.0 && sentence_count > 0.0 {
        4.71 * (char_count / word_count) + 0.5 * (word_count / sentence_count) - 21.43
    } else {
        0.0
    };

    // 4. Keyword Extraction (Basic TF-IDF style frequency)
    let mut word_freq = std::collections::HashMap::new();
    let stop_words = ["the", "is", "at", "which", "on", "and", "a", "an", "in", "to", "of", "for", "it", "with", "as", "be", "that", "by", "are", "this", "or", "from", "but", "not", "what", "all", "were", "we", "when", "your", "can", "said", "there", "use", "an", "each", "which", "she", "do", "how", "their", "if", "will", "up", "other", "about", "out", "many", "then", "them", "these", "so", "some", "her", "would", "make", "like", "him", "into", "time", "has", "look", "two", "more", "write", "go", "see", "number", "no", "way", "could", "people", "my", "than", "first", "water", "been", "call", "who", "oil", "its", "now", "find"];
    
    for word in &words {
        let clean_word = word.to_lowercase().chars().filter(|c| c.is_alphanumeric()).collect::<String>();
        if clean_word.len() > 3 && !stop_words.contains(&clean_word.as_str()) {
            *word_freq.entry(clean_word).or_insert(0) += 1;
        }
    }

    let mut keywords: Vec<(String, i32)> = word_freq.into_iter().collect();
    keywords.sort_by(|a, b| b.1.cmp(&a.1));
    let top_keywords = keywords.into_iter().take(5).map(|(k, _)| k).collect::<Vec<_>>().join(", ");


    IntelligenceResult {
        readability_score: ari,
        sentiment_score: compound,
        sentiment_label: label.to_string(),
        extracted_text: text.chars().take(500).collect::<String>(), // Preview
        keywords: top_keywords,
    }
}
