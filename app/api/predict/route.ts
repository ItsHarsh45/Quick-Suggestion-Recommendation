import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';

// Define proper types
interface DataRow {
  [key: string]: string;
  'Self-care tips that might help you out': string;
}

interface Column {
  name: string;
  type: 'categorical';
  options: string[];
}

// Use a more specific type for the cached data
interface CacheData {
  mlData: DataRow[];
  columnInfo: Column[];
  lastUpdated: number;
}

// Cache configuration
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
let cache: CacheData | null = null;

async function loadAndProcessData(): Promise<CacheData> {
  const dataPath = path.join(process.cwd(), 'public', 'data.csv');
  const csvData = await fs.readFile(dataPath, 'utf-8');
  
  // Parse CSV data with type checking
  const parsedData = Papa.parse(csvData, { 
    header: true,
    skipEmptyLines: true,
    transform: (value) => value.trim()
  });
  
  const mlData = parsedData.data as DataRow[];
  
  // Validate data structure
  if (!mlData.length || !('Self-care tips that might help you out' in mlData[0])) {
    throw new Error('Invalid data structure in CSV');
  }
  
  // Process column information more efficiently
  const headers = Object.keys(mlData[0]).filter(header => 
    header !== 'Self-care tips that might help you out'
  );
  
  const columnInfo = headers.map(colname => {
    // Use Set for efficient unique value collection
    const uniqueValues = new Set<string>();
    for (const row of mlData) {
      if (row[colname]) uniqueValues.add(row[colname]);
    }
    
    return {
      name: colname,
      type: 'categorical' as const,
      options: Array.from(uniqueValues).sort()
    };
  });
  
  return {
    mlData,
    columnInfo,
    lastUpdated: Date.now()
  };
}

async function getCachedData(): Promise<CacheData> {
  // Check if cache needs refresh
  if (!cache || Date.now() - cache.lastUpdated > CACHE_DURATION) {
    try {
      cache = await loadAndProcessData();
    } catch (error) {
      console.error('Error loading data:', error);
      throw new Error('Failed to load data');
    }
  }
  return cache;
}

function findBestMatch(userInput: Record<string, string>, mlData: DataRow[]): DataRow {
  let bestMatch = mlData[0];
  let maxScore = -1;
  
  const inputEntries = Object.entries(userInput);
  const totalFields = inputEntries.length;
  
  for (const row of mlData) {
    let score = 0;
    
    for (const [key, value] of inputEntries) {
      // Weighted scoring: exact matches get 1 point
      if (row[key] === value) {
        score++;
      }
    }
    
    // Normalize score to account for missing fields
    const normalizedScore = score / totalFields;
    
    if (normalizedScore > maxScore) {
      maxScore = normalizedScore;
      bestMatch = row;
    }
  }
  
  return bestMatch;
}

export async function POST(req: Request) {
  try {
    const { mlData } = await getCachedData();
    const userInput = await req.json();
    
    // Input validation
    if (!userInput || typeof userInput !== 'object') {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid input format' 
      }, { status: 400 });
    }
    
    const bestMatch = findBestMatch(userInput, mlData);
    
    return NextResponse.json({ 
      success: true, 
      prediction: bestMatch['Self-care tips that might help you out']
    });
    
  } catch (error) {
    console.error('Recommendation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate recommendation' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { columnInfo } = await getCachedData();
    
    return NextResponse.json({ 
      success: true, 
      columns: columnInfo 
    });
    
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to load form structure' 
    }, { status: 500 });
  }
}