use polars::prelude::*;
use polars::prelude::PolarsError;
use polars::frame::row::Row;

use std::error::Error;

#[derive(serde::Serialize)]
pub struct DataFrameStats {
    pub row_count: usize,
    pub column_count: usize,
    pub columns: Vec<String>,
    pub preview: Vec<Vec<String>>,
}

pub fn load_csv_preview(path: &str) -> Result<DataFrameStats, Box<dyn Error>> {
    let file = std::fs::File::open(path)?;
    let df = CsvReader::new(file)
        .finish()?;

    let row_count = df.height();
    let column_count = df.width();
    let columns = df.get_column_names().iter().map(|s| s.to_string()).collect();

    // Get preview (first 5 rows)
    let preview_df = df.head(Some(5));
    let mut preview = Vec::new();

    // Iterate rows for preview
    for i in 0..preview_df.height() {
        let row: Row = preview_df.get_row(i).map_err(|e: PolarsError| e.to_string())?;
        let mut row_vec = Vec::new();
        for val in row.0.iter() {
            row_vec.push(format!("{}", val));
        }
        preview.push(row_vec);
    }

    Ok(DataFrameStats {
        row_count,
        column_count,
        columns,
        preview,
    })
}

#[tauri::command]
pub async fn load_dataset(path: String) -> Result<DataFrameStats, String> {
    load_csv_preview(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clean_dataset(path: String) -> Result<String, String> {
    // Basic cleaning: Dedup
    let file = std::fs::File::open(path.clone()).map_err(|e| e.to_string())?;
    let df = CsvReader::new(file)
        .finish()
        .map_err(|e: PolarsError| e.to_string())?;

    let subset: Option<Vec<String>> = None;
    let cleaned = df.unique::<&[String], String>(subset.as_deref(), polars::prelude::UniqueKeepStrategy::First, None::<(i64, usize)>).map_err(|e: PolarsError| e.to_string())?;
    
    // Save to a temporary or new file (e.g., name_cleaned.csv)
    let new_path = path.replace(".csv", "_cleaned.csv");
    let mut file = std::fs::File::create(&new_path).map_err(|e| e.to_string())?;
    CsvWriter::new(&mut file)
        .finish(&mut cleaned.clone())
        .map_err(|e| e.to_string())?;

    Ok(new_path)
}

#[tauri::command]
pub async fn save_dataset(path: String, format: String) -> Result<String, String> {
    let file = std::fs::File::open(path.clone()).map_err(|e| e.to_string())?;
    let mut df = CsvReader::new(file)
        .finish()
        .map_err(|e: PolarsError| e.to_string())?;

    let new_path = match format.as_str() {
        "json" => {
            let p = path.replace(".csv", ".json");
            let file = std::fs::File::create(&p).map_err(|e| e.to_string())?;
            JsonWriter::new(file)
                .finish(&mut df)
                .map_err(|e| e.to_string())?;
            p
        }
        "parquet" => {
            let p = path.replace(".csv", ".parquet");
            let file = std::fs::File::create(&p).map_err(|e| e.to_string())?;
            ParquetWriter::new(file)
                .finish(&mut df)
                .map_err(|e| e.to_string())?;
            p
        }
        _ => return Err("Unsupported format".to_string()),
    };

    Ok(new_path)
}
