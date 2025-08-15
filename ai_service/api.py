from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag_pipeline import (
    classify_query,
    retrieve_property_recommendations,
    retrieve_market_trends_and_legal,
    augment_with_context,
    sync_new_listings_to_chroma,
    add_pdfs_to_chroma
)

app = FastAPI(
    title="Estatify RAG API",
    description="FastAPI endpoints for RAG-powered real estate assistant",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Frontend on port 5173
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Request model for RAG query
class QueryRequest(BaseModel):
    query: str

# Endpoint to process a user query with RAG
@app.post("/rag_query")
def rag_query(request: QueryRequest):
    try:
        query = request.query
        if not query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
            
        category = classify_query(query)
        if category == "property_recommendation":
            results = retrieve_property_recommendations(query)
        elif category in ["market_trends", "legal_faq"]:
            results = retrieve_market_trends_and_legal(query, category)
        else:
            results = []
        print(f"Query category: {category}, Results found: {len(results)}")
        answer = augment_with_context(query, results)
        return {"category": category, "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Endpoint to sync new listings from MongoDB to Chroma
@app.post("/sync_listings")
def sync_listings():
    try:
        sync_new_listings_to_chroma()
        return {"success": True, "message": "Listings synced to ChromaDB."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to add PDFs to Chroma
class PDFRequest(BaseModel):
    pdf_paths: list
    source_type: str

@app.post("/add_pdfs")
def add_pdfs(request: PDFRequest):
    try:
        add_pdfs_to_chroma(request.pdf_paths, request.source_type)
        return {"success": True, "message": f"PDFs added to ChromaDB as {request.source_type}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
def health():
    return {"status": "ok"}