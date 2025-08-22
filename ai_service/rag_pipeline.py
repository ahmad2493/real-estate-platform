import os
import io
from pydoc import doc
from pymongo import MongoClient
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.retrievers.multi_query import MultiQueryRetriever

# New imports for lease generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from datetime import datetime, timedelta
import uuid
from typing import Dict, Any, Optional
import json

from shapely import buffer

load_dotenv()

# --------------------------
# 1. MongoDB connection
# --------------------------
mongo_client = MongoClient(os.getenv("MONGODB_URI"))
db = mongo_client["realestate"]
listings_collection = db["properties"]

# --------------------------
# 2. Helper functions
# --------------------------
def format_address(address: dict) -> str:
    parts = [
        address.get("street", ""),
        address.get("city", ""),
        address.get("state", ""),
        address.get("country", "")
    ]
    return ", ".join([p for p in parts if p])

def format_details(details: dict) -> str:
    return ", ".join([
        f"{details.get('bedrooms')} Bedrooms" if details.get('bedrooms') else "",
        f"{details.get('bathrooms')} Bathrooms" if details.get('bathrooms') else "",
        f"{details.get('area')} sqft" if details.get('area') else "",
        f"{details.get('parking')} Parking" if details.get('parking') else "",
    ]).strip(", ")

def transform_property_for_embedding(listing: dict) -> str:
    """Create a clean text block for embedding."""
    title = listing.get("title", "")
    description = listing.get("description", "")
    amenities = ", ".join(listing.get("amenities", []))
    address = format_address(listing.get("address", {}))
    details = format_details(listing.get("details", {}))
    price = listing.get("price", "")
    
    return f"""
    Title: {title}
    Description: {description}
    Price: {price}
    Amenities: {amenities}
    Address: {address}
    Details: {details}
    """

# --------------------------
# 3. Load listings from MongoDB
# --------------------------
def load_new_listings():
    listings = list(listings_collection.find({}))
    docs = []

    for listing in listings:
        page_content = transform_property_for_embedding(listing)
        
        metadata = {
            "id": str(listing["_id"]),
            "price": listing.get("price"),
            "category": listing.get("category"),
            "status": listing.get("status"),
            "source": "property_listing"
        }
        
        docs.append(Document(page_content=page_content.strip(), metadata=metadata))

    return docs

# --------------------------
# 4. Load PDFs for market trends & legal FAQs (with splitting)
# --------------------------
def load_pdfs(pdf_paths, source_type):
    docs = []
    for path in pdf_paths:
        loader = PyMuPDFLoader(path)
        raw_docs = loader.load()

        # Choose splitting method based on source type
        if source_type == "market_trends":
            # Split when there is a heading followed by 1-2 blank lines
            splitter = RecursiveCharacterTextSplitter(
    chunk_size=2000,  # large enough to keep full paragraph
    chunk_overlap=0,
    separators=["\n\n"]  # split only at double newlines
)

        elif source_type == "legal_faq":
            # Split on numbered Q/A style headings like "9. Lease of State Land?"
            splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,  # large enough to keep full paragraph
    chunk_overlap=0,
    separators=["\n\n"]  # split only at double newlines
)
        else:
            # Default: chunk by character size
            splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)

        split_docs = splitter.split_documents(raw_docs)

        # Add metadata for filtering later
        for doc in split_docs:
            doc.metadata["source"] = source_type

        docs.extend(split_docs)

    return docs

# --------------------------
# 5. Models
# --------------------------
embedding_model = OpenAIEmbeddings(
    model="text-embedding-3-large" 
)

model = ChatOpenAI(
    model="gpt-4o-mini",  
    temperature=0.7
)

# --------------------------
# 6. Query classification (Updated)
# --------------------------
def classify_query(query: str) -> str:
    prompt = f"""
    You are a classifier for a real estate platform.

    Categories:
    1. property_recommendation → User is looking for properties to see/buy/rent, often mentioning price, bedrooms, location, or amenities.
    2. market_trends → User is asking about real estate market data, price changes, investment trends, demand/supply analysis.
    3. legal_faq → User is asking about property laws, ownership rules, taxes, or real estate regulations.
    4. lease_generation → User wants to create, generate, or draft a lease agreement/contract.
    5. none → User's query does not fit any of the above categories.

    Classify the following query into exactly one category.
    Query: "{query}"

    Respond with only the category name: property_recommendation, market_trends, legal_faq, lease_generation, or none.
    """

    response = model.invoke(prompt).content.strip().lower()
    return response

# --------------------------
# 7. Chroma DB setup
# --------------------------
chroma_db = Chroma(
    collection_name="proptech_rag",
    embedding_function=embedding_model,
    persist_directory="./chroma_db"
)

# --------------------------
# 8. Add new listings
# --------------------------
def sync_new_listings_to_chroma():
    docs = load_new_listings()
    if docs:
        chroma_db.add_documents(docs)
        print(f"Synced {len(docs)} listings to Chroma")
    else:
        print("No listings found to sync.")

def sync_single_listing_to_chroma(listing: dict):
    page_content = transform_property_for_embedding(listing)
    metadata = {
        "id": str(listing.get("_id", "")),
        "price": listing.get("price"),
        "category": listing.get("category"),
        "status": listing.get("status"),
        "source": "property_listing"
    }
    doc = Document(page_content=page_content.strip(), metadata=metadata)
    chroma_db.add_documents([doc])
    print(f"Synced property {metadata['id']} to ChromaDB")

def delete_single_listing_from_chroma(listing_id: str):
    try:
        # Delete by metadata filter
        chroma_db.delete(where={"id": listing_id})
        print(f"Deleted property {listing_id} from ChromaDB")
    except Exception as e:
        print(f"Error deleting property {listing_id} from ChromaDB: {str(e)}")
        raise e
    
def update_single_listing_in_chroma(listing_id: str, updated_listing: dict):
    try:
        # First, delete the existing document
        delete_single_listing_from_chroma(listing_id)
        
        # Then add the updated document
        sync_single_listing_to_chroma(updated_listing)
        
        print(f"Updated property {listing_id} in ChromaDB")
    except Exception as e:
        print(f"Error updating property {listing_id} in ChromaDB: {str(e)}")
        raise e

# --------------------------
# 9. Add PDFs
# --------------------------
def add_pdfs_to_chroma(pdf_paths, source_type):
    docs = load_pdfs(pdf_paths, source_type)
    if docs:
        chroma_db.add_documents(docs)
        print(f"Added {len(docs)} chunks from {source_type} to Chroma")
    else:
        print("No PDF docs found.")

# --------------------------
# 10. Retrieval
# --------------------------
def retrieve_property_recommendations(query, k=10, lambda_mult=0.5):
    search_kwargs = {
        "k": k,
        "lambda_mult": lambda_mult,
        "filter": {"source": "property_listing"} 
    }
    retriever = chroma_db.as_retriever(
        search_type="mmr",
        search_kwargs=search_kwargs
    )
    return retriever.invoke(query)

def retrieve_market_trends_and_legal(query, category, k=5):
    retriever = MultiQueryRetriever.from_llm(
        retriever=chroma_db.as_retriever(search_kwargs={"k": k, "filter": {"source": category}}),
        llm=ChatOpenAI(model="gpt-4o-mini")
    )
    return retriever.invoke(query)

# --------------------------
# 11. Lease Generation Classes
# --------------------------

class LeaseData:
    """Data structure to hold all lease information"""
    def __init__(self, lease_info: Dict[str, Any]):
        # Property Information
        self.property_address = lease_info.get('property_address', '')
        self.property_type = lease_info.get('property_type', '')
        self.property_description = lease_info.get('property_description', '')
        
        # Landlord Information
        self.landlord_name = lease_info.get('landlord_name', '')
        self.landlord_address = lease_info.get('landlord_address', '')
        self.landlord_phone = lease_info.get('landlord_phone', '')
        self.landlord_email = lease_info.get('landlord_email', '')
        
        # Tenant Information
        self.tenant_name = lease_info.get('tenant_name', '')
        self.tenant_address = lease_info.get('tenant_address', '')
        self.tenant_phone = lease_info.get('tenant_phone', '')
        self.tenant_email = lease_info.get('tenant_email', '')
        
        # Lease Terms
        self.lease_start_date = lease_info.get('lease_start_date', '')
        self.lease_end_date = lease_info.get('lease_end_date', '')
        self.monthly_rent = lease_info.get('monthly_rent', '')
        self.security_deposit = lease_info.get('security_deposit', '')
        self.late_fee = lease_info.get('late_fee', '50')
        self.pet_policy = lease_info.get('pet_policy', 'No pets allowed')
        self.utilities_included = lease_info.get('utilities_included', [])
        
        # Additional Terms
        self.special_conditions = lease_info.get('special_conditions', [])
        self.maintenance_responsibility = lease_info.get('maintenance_responsibility', 'Landlord')

class LeaseGenerator:
    """Generates lease documents using LLM and converts to PDF"""
    
    def __init__(self, llm_model):
        self.llm = llm_model
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles for the lease document"""
        self.styles.add(ParagraphStyle(
            name='LeaseTitle',
            parent=self.styles['Title'],
            fontSize=16,
            spaceAfter=20,
            alignment=1  # Center alignment
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=12,
            spaceBefore=15,
            spaceAfter=10,
            textColor=colors.darkblue
        ))
        
        self.styles.add(ParagraphStyle(
            name='LeaseBody',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceBefore=6,
            spaceAfter=6,
            leftIndent=20
        ))

    def generate_lease_content(self, lease_data: LeaseData, user) -> str:
        """Use LLM to generate comprehensive lease content"""
        
        allowed_roles = ["admin", "owner", "agent"]
        if not user or user.get("role") not in allowed_roles:
            raise Exception("Access denied. Only admin, owner, or agent can generate lease PDFs.")
        
        prompt = f"""
You are a legal document expert specializing in residential lease agreements. Generate a comprehensive, legally sound lease agreement based on the provided information.

LEASE INFORMATION:
- Property: {lease_data.property_address}
- Property Type: {lease_data.property_type}
- Description: {lease_data.property_description}
- Landlord: {lease_data.landlord_name}
- Tenant: {lease_data.tenant_name}
- Lease Period: {lease_data.lease_start_date} to {lease_data.lease_end_date}
- Monthly Rent: ${lease_data.monthly_rent}
- Security Deposit: ${lease_data.security_deposit}
- Late Fee: ${lease_data.late_fee}
- Pet Policy: {lease_data.pet_policy}
- Utilities Included: {', '.join(lease_data.utilities_included) if lease_data.utilities_included else 'None'}
- Special Conditions: {', '.join(lease_data.special_conditions) if lease_data.special_conditions else 'None'}

REQUIREMENTS:
1. Create a professional residential lease agreement
2. Include all standard lease clauses (rent payment, security deposit, maintenance, etc.)
3. Incorporate the specific details provided above
4. Use clear, legal language appropriate for a binding contract
5. Structure the content with clear sections and numbered clauses
6. Include signature lines at the end
7. Add a clause about lease renewal and termination
8. Include dispute resolution and governing law sections

Generate the complete lease agreement content in a structured format with clear section headers.
"""

        response = self.llm.invoke(prompt)
        return response.content.strip()

    def create_pdf_buffer(self, lease_content: str, lease_data: LeaseData) -> io.BytesIO:
        """Convert lease content to PDF document in memory buffer"""
    
        buffer = io.BytesIO()
    
        doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
        )
    
        story = []
    
        # Title
        story.append(Paragraph("RESIDENTIAL LEASE AGREEMENT", self.styles['LeaseTitle']))
        story.append(Spacer(1, 20))
    
        # Property and Party Information Table
        party_data = [
        ['PROPERTY ADDRESS:', lease_data.property_address],
        ['LANDLORD:', f"{lease_data.landlord_name}<br/>{lease_data.landlord_address}<br/>Phone: {lease_data.landlord_phone}<br/>Email: {lease_data.landlord_email}"],
        ['TENANT:', f"{lease_data.tenant_name}<br/>{lease_data.tenant_address}<br/>Phone: {lease_data.tenant_phone}<br/>Email: {lease_data.tenant_email}"],
        ['LEASE PERIOD:', f"{lease_data.lease_start_date} to {lease_data.lease_end_date}"],
        ['MONTHLY RENT:', f"${lease_data.monthly_rent}"],
        ['SECURITY DEPOSIT:', f"${lease_data.security_deposit}"]
        ]
    
        party_table = Table(party_data, colWidths=[2*inch, 4*inch])
        party_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
    
        story.append(party_table)
        story.append(Spacer(1, 20))
    
        # Parse and add the generated lease content
        sections = lease_content.split('\n\n')
    
        for section in sections:
            if section.strip():
                # Check if it's a section header
                if any(keyword in section.upper() for keyword in ['SECTION', 'ARTICLE', 'CLAUSE']) or section.strip().endswith(':'):
                    story.append(Paragraph(section.strip(), self.styles['SectionHeader']))
                else:
                    story.append(Paragraph(section.strip(), self.styles['LeaseBody']))
                story.append(Spacer(1, 6))
    
        # Signature Section
        story.append(Spacer(1, 30))
        story.append(Paragraph("SIGNATURES", self.styles['SectionHeader']))
    
        signature_data = [
        ['LANDLORD SIGNATURE:', '____________________', 'DATE:', '____________'],
        [f"Print Name: {lease_data.landlord_name}", '', '', ''],
        ['', '', '', ''],
        ['TENANT SIGNATURE:', '____________________', 'DATE:', '____________'],
        [f"Print Name: {lease_data.tenant_name}", '', '', '']
        ]
    
        signature_table = Table(signature_data, colWidths=[2*inch, 2*inch, 1*inch, 1*inch])
        signature_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ]))
    
        story.append(signature_table)
    
        # Build PDF
        doc.build(story)
    
        # Reset buffer position to beginning
        buffer.seek(0)
        return buffer

# --------------------------
# 12. Enhanced RAG Functions for Lease Generation
# --------------------------

def generate_lease_pdf(lease_info: Dict[str, Any], user) -> Dict[str, Any]:
    try:
        # Validate input data
        required_fields = ['property_address', 'landlord_name', 'tenant_name', 
                          'lease_start_date', 'lease_end_date', 'monthly_rent', 'security_deposit']
        
        missing_fields = [field for field in required_fields if not lease_info.get(field)]
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Generate unique lease ID
        lease_id = str(uuid.uuid4())
        
        # Create lease data object
        lease_data = LeaseData(lease_info)
        
        # Initialize lease generator
        lease_generator = LeaseGenerator(model)
        
        # Generate lease content using LLM
        lease_content = lease_generator.generate_lease_content(lease_data, user)
        
        # Create PDF in memory
        pdf_buffer = lease_generator.create_pdf_buffer(lease_content, lease_data)
        
        return {
            "success": True,
            "lease_id": lease_id,
            "pdf_buffer": pdf_buffer,
            "filename": f"lease_agreement_{lease_id}.pdf",
            "message": "Lease PDF generated successfully"
        }
        
    except Exception as e:
        print(f"Error generating lease PDF: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to generate lease PDF: {str(e)}"
        }

def get_lease_template_fields() -> Dict[str, Any]:
    """Returns the required fields for lease generation"""
    return {
        "property_info": {
            "property_address": {"type": "string", "required": True},
            "property_type": {"type": "string", "required": True, "options": ["Apartment", "House", "Condo", "Townhouse"]},
            "property_description": {"type": "text", "required": False}
        },
        "landlord_info": {
            "landlord_name": {"type": "string", "required": True},
            "landlord_address": {"type": "string", "required": True},
            "landlord_phone": {"type": "string", "required": True},
            "landlord_email": {"type": "email", "required": True}
        },
        "tenant_info": {
            "tenant_name": {"type": "string", "required": True},
            "tenant_address": {"type": "string", "required": False},
            "tenant_phone": {"type": "string", "required": True},
            "tenant_email": {"type": "email", "required": True}
        },
        "lease_terms": {
            "lease_start_date": {"type": "date", "required": True},
            "lease_end_date": {"type": "date", "required": True},
            "monthly_rent": {"type": "number", "required": True},
            "security_deposit": {"type": "number", "required": True},
            "late_fee": {"type": "number", "required": False, "default": 50},
            "pet_policy": {"type": "text", "required": False},
            "utilities_included": {"type": "array", "required": False, "options": ["Water", "Electricity", "Gas", "Internet", "Cable", "Trash"]},
            "special_conditions": {"type": "array", "required": False}
        }
    }

def handle_lease_generation_query(query: str, conversation_history=None, user=None) -> str:
    """Handle queries related to lease generation"""
    
    allowed_roles = ["admin", "owner", "agent"]
    if not user or user.get("role") not in allowed_roles:
        raise Exception("Access denied. Only admin, owner, or agent can generate lease PDFs.")
    
    conversation_context = ""
    if conversation_history and len(conversation_history) > 0:
        conversation_context = "PREVIOUS CONVERSATION:\n"
        for msg in conversation_history:
            role = "User" if msg.role == "user" else "Assistant"
            conversation_context += f"{role}: {msg.content}\n"
        conversation_context += "\n"

    # Check if user is asking to generate/create/draft a lease
    generate_keywords = ['generate', 'create', 'draft', 'make', 'prepare', 'download']
    if any(keyword in query.lower() for keyword in generate_keywords) and 'lease' in query.lower():
        
        # Try to extract lease information from conversation
        lease_info = extract_lease_info_from_conversation(conversation_history)
        
        # Check if we have all required fields
        required_fields = ['property_address', 'landlord_name', 'tenant_name', 
                          'lease_start_date', 'lease_end_date', 'monthly_rent', 'security_deposit']
        
        if lease_info and all(lease_info.get(field) for field in required_fields):
            # We have enough info - return special marker for frontend to detect
            import json
            return f"""**LEASE_GENERATION_READY**

I have all the required information to generate your lease agreement. Let me create the PDF for you now.

```json
{json.dumps(lease_info, indent=2)}
```

**GENERATE_LEASE_PDF**"""

    # If not enough info, guide them through collection
    prompt = f"""
You are Estatify's AI assistant helping with lease document generation.

{conversation_context}

The user is asking about lease generation. Guide them through collecting this required information:

**Required Information:**
1. Property address
2. Landlord full name  
3. Landlord phone and email
4. Tenant full name
5. Tenant phone and email
6. Lease start date (YYYY-MM-DD format)
7. Lease end date (YYYY-MM-DD format)  
8. Monthly rent amount (numbers only, no $ sign)
9. Security deposit amount (numbers only, no $ sign)

Ask for missing information in a friendly, step-by-step manner. If they provide information, acknowledge it and ask for the next missing piece.

Current user question: {query}

Respond helpfully and guide them to provide the needed information.
"""
    
    return model.invoke(prompt).content.strip()

def extract_lease_info_from_conversation(conversation_history):
    """Extract lease information from conversation history using LLM"""
    if not conversation_history:
        return None
        
    conversation_text = ""
    for msg in conversation_history[-20:]:  # Last 20 messages only
        role = "User" if msg.role == "user" else "Assistant"
        conversation_text += f"{role}: {msg.content}\n"
    
    prompt = f"""
Extract lease information from this conversation. Return ONLY a valid JSON object with the lease details, or return "INSUFFICIENT_DATA" if not enough information is provided.

Required fields that MUST be present:
- property_address (full address as string)
- landlord_name (full name)
- tenant_name (full name)  
- lease_start_date (YYYY-MM-DD format)
- lease_end_date (YYYY-MM-DD format)
- monthly_rent (number only, no currency symbols)
- security_deposit (number only, no currency symbols)

Optional fields:
- landlord_phone, landlord_email, landlord_address
- tenant_phone, tenant_email, tenant_address
- property_type, late_fee, pet_policy

Conversation:
{conversation_text}

Return ONLY valid JSON or "INSUFFICIENT_DATA":
"""
    
    try:
        response = model.invoke(prompt).content.strip()
        if response == "INSUFFICIENT_DATA":
            return None
        
        import json
        # Remove any markdown formatting
        if response.startswith('```json'):
            response = response.replace('```json', '').replace('```', '').strip()
        
        lease_data = json.loads(response)
        return lease_data
    except Exception as e:
        print(f"Error extracting lease info: {e}")
        return None
    
# --------------------------
# 13. Enhanced Augmentation (Updated)
# --------------------------
def augment_with_context(query, retrieved_docs, conversation_history=None, user=None):
    """Enhanced version that handles lease generation queries"""
    
    # Classify the query
    query_type = classify_query(query)
    
    if query_type == "lease_generation":
        return handle_lease_generation_query(query, conversation_history, user)
    
    # Original logic for other query types
    context_text = "\n\n".join([doc.page_content for doc in retrieved_docs])
    
    # Build conversation history string
    conversation_context = ""
    if conversation_history and len(conversation_history) > 0:
        conversation_context = "PREVIOUS CONVERSATION:\n"
        for msg in conversation_history:
            role = "User" if msg.role == "user" else "Assistant"
            conversation_context += f"{role}: {msg.content}\n"
        conversation_context += "\n"

    prompt = f"""
You are Estatify's AI real estate assistant - a knowledgeable, professional, and helpful expert in property buying, selling, and market insights.

{conversation_context}GUIDELINES:
- Use ONLY the provided CONTEXT to answer questions accurately
- Consider the conversation history to provide contextual responses
- If the user refers to previous messages (like "that property", "the one you mentioned"), use the conversation history to understand the reference
- Be conversational yet professional (this appears in a website chatbot)
- For property recommendations: highlight key features, location benefits, and value propositions
- For market trends: provide clear insights with specific data points from the CONTEXT
- For legal questions: give accurate information from the CONTEXT but remind users to consult professionals for specific cases
- Keep responses concise but informative
- If CONTEXT is insufficient, politely explain what you can help with instead

CONTEXT:
{context_text}

CURRENT USER QUESTION:
{query}
"""    
    return model.invoke(prompt).content.strip()