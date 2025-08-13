from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from dotenv import load_dotenv
from rag_pipeline import embed_listing_by_id, retrieve_context

load_dotenv()
app = FastAPI()

# Request model for embedding a property
class EmbedRequest(BaseModel):
    listing_id: str

# Request model for querying RAG
class QueryRequest(BaseModel):
    query: str
    k: int = 5

@app.post("/embed_property")
def embed_property(request: EmbedRequest):
    try:
        object_id = ObjectId(request.listing_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid listing_id format")

    success = embed_listing_by_id(object_id)
    if not success:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"status": "Property embedded successfully"}

@app.post("/rag_query")
def rag_query(request: QueryRequest):
    results = retrieve_context(request.query, request.k)
    return {
        "results": [
            {
                "page_content": doc.page_content,
                "metadata": doc.metadata
            }
            for doc in results
        ]
    }
