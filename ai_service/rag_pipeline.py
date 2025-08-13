import os
from pymongo import MongoClient
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.retrievers.multi_query import MultiQueryRetriever

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
# 3. Load new listings from MongoDB
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
# 6. Query classification
# --------------------------
def classify_query(query: str) -> str:
    prompt = f"""
    You are a classifier for a real estate platform.

    Categories:
    1. property_recommendation → User is looking for specific properties to buy/rent, often mentioning price, bedrooms, location, or amenities.
    2. market_trends → User is asking about real estate market data, price changes, investment trends, demand/supply analysis.
    3. legal_faq → User is asking about property laws, ownership rules, taxes, or real estate regulations.

    Classify the following query into exactly one category.
    Query: "{query}"

    Respond with only the category name: property_recommendation, market_trends, or legal_faq.
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
def retrieve_property_recommendations(query, k=6, lambda_mult=0.5):
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
        llm=ChatOpenAI(model="gpt-3.5-turbo")
    )
    return retriever.invoke(query)


# --------------------------
# 11. Augmentation
# --------------------------
def augment_with_context(query, retrieved_docs):
    context_text = "\n\n".join([doc.page_content for doc in retrieved_docs])

    prompt = f"""
You are an expert assistant for a real estate intelligence platform.
Use ONLY the provided CONTEXT to answer the user's question accurately.
If the context does not contain enough information, clearly apologize 
and say that you don't know about this, you were not made for this purpose.

CONTEXT:
{context_text}

USER QUESTION:
{query}
"""
    
    return model.invoke(prompt).content.strip()


# --------------------------
# Test run
# --------------------------
if __name__ == "__main__":
    # Sync listings from MongoDB
    #sync_new_listings_to_chroma()

    # Add PDFs
    #add_pdfs_to_chroma(["D:/proptech-platform/ai_service/pdfs/market_trends.pdf"], "market_trends")
    #add_pdfs_to_chroma(["D:/proptech-platform/ai_service/pdfs/legal_faqs.pdf"], "legal_faq")

    # Example query
    query = "suggest a house for me (i belong to middle class)"

    # 1. Classify query
    category = classify_query(query)
    print(f"Query category: {category}")

    # 2. Retrieve based on category
    if category == "property_recommendation":
        results = retrieve_property_recommendations(query)
    elif category in ["market_trends", "legal_faq"]:
        results = retrieve_market_trends_and_legal(query, category)
    else:
        results = []
        print("Unknown category. No results retrieved.")

    # 3. Display results
    # print("\nSearch Results:")
    # for i, doc in enumerate(results):
    #     print(f"\nResult {i + 1}:")
    #     print(doc.page_content)
    #     print("Metadata:", doc.metadata)

final_answer = augment_with_context(query, results)
print(final_answer)

