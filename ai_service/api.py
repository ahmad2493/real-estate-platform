from fastapi import Request, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from fastapi.responses import StreamingResponse
import io
from rag_pipeline import (
    classify_query,
    retrieve_property_recommendations,
    retrieve_market_trends_and_legal,
    augment_with_context,
    sync_new_listings_to_chroma,
    sync_single_listing_to_chroma,
    delete_single_listing_from_chroma,
    update_single_listing_in_chroma,
    add_pdfs_to_chroma,
    generate_lease_pdf,
    get_lease_template_fields
)
from slowapi import Limiter
from slowapi.util import get_remote_address

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

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Models for conversation context
class ConversationMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class QueryRequest(BaseModel):
    query: str
    conversation_history: Optional[List[ConversationMessage]] = []

class FullListingRequest(BaseModel):
    listing: dict

class UpdateListingRequest(BaseModel):
    listing_id: str
    updated_listing: dict

class DeleteListingRequest(BaseModel):
    listing_id: str

class PDFRequest(BaseModel):
    pdf_paths: list
    source_type: str

class LeaseGenerationRequest(BaseModel):
    lease_info: dict

# Endpoint to process a user query with RAG and conversation context
@app.post("/rag_query")
@limiter.limit("10/minute")
def rag_query(request: Request, body: QueryRequest):
    try:
        query = body.query
        conversation_history = body.conversation_history or []
        
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
        answer = augment_with_context(query, results, conversation_history)
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

@app.post("/sync_listing_object")
def sync_listing_object(body: FullListingRequest):
    try:
        listing = body.listing
        
        if not listing:
            raise HTTPException(status_code=400, detail="Listing object cannot be empty")
        
        # Ensure the listing has an _id field
        if "_id" not in listing:
            raise HTTPException(status_code=400, detail="Listing must have an _id field")
        
        # Directly sync the provided listing object to ChromaDB
        sync_single_listing_to_chroma(listing)
        
        return {
            "success": True,
            "message": f"Listing synced to ChromaDB successfully", 
            "listing_id": str(listing["_id"]),
            "listing_title": listing.get("title", "")
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
# Endpoint to update a single listing in Chroma
@app.put("/update_listing_object")
def update_listing_object(body: UpdateListingRequest):
    try:
        listing_id = body.listing_id
        updated_listing = body.updated_listing
        
        if not listing_id:
            raise HTTPException(status_code=400, detail="Listing ID cannot be empty")
        
        if not updated_listing:
            raise HTTPException(status_code=400, detail="Updated listing object cannot be empty")
        
        # Ensure the updated listing has the same _id
        updated_listing["_id"] = listing_id
        
        # Update the listing in ChromaDB
        update_single_listing_in_chroma(listing_id, updated_listing)
        
        return {
            "success": True,
            "message": f"Listing updated in ChromaDB successfully", 
            "listing_id": listing_id,
            "listing_title": updated_listing.get("title", "")
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Endpoint to delete a single listing from Chroma
@app.delete("/delete_listing_object")
def delete_listing_object(body: DeleteListingRequest):
    try:
        listing_id = body.listing_id
        
        if not listing_id:
            raise HTTPException(status_code=400, detail="Listing ID cannot be empty")
        
        # Delete the listing from ChromaDB
        delete_single_listing_from_chroma(listing_id)
        
        return {
            "success": True,
            "message": f"Listing deleted from ChromaDB successfully", 
            "listing_id": listing_id
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Endpoint to add PDFs to Chroma
@app.post("/add_pdfs")
def add_pdfs(request: PDFRequest):
    try:
        add_pdfs_to_chroma(request.pdf_paths, request.source_type)
        return {"success": True, "message": f"PDFs added to ChromaDB as {request.source_type}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_lease")
@limiter.limit("5/minute")
def generate_lease(request: Request, body: LeaseGenerationRequest):
    try:
        lease_info = body.lease_info
        
        if not lease_info:
            raise HTTPException(status_code=400, detail="Lease information cannot be empty")
        
        # Validate required fields
        required_fields = ["property_address", "landlord_name", "tenant_name", 
                          "lease_start_date", "lease_end_date", "monthly_rent", "security_deposit"]
        
        missing_fields = [field for field in required_fields if not lease_info.get(field)]
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
        
        # Generate the lease PDF
        result = generate_lease_pdf(lease_info)
        
        if result["success"]:
            # Return the PDF as a streaming response
            return StreamingResponse(
                result["pdf_buffer"],
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={result['filename']}",
                    "X-Lease-ID": result["lease_id"]
                }
            )
        else:
            raise HTTPException(status_code=500, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Health check endpoint
@app.get("/health")
def health():
    return {"status": "ok"}