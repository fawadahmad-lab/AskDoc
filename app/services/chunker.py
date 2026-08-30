"""Split extracted PDF pages into chunks."""

from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=120,
    separators=[
        "\n\n",
        "\n",
        ". ",
        " ",
        "",
    ],
)


def chunk_pages(
    pages: List[dict],
    document_id: int,
    user_id: int,
) -> List[dict]:
    """Split extracted PDF pages into chunks while preserving metadata."""
    chunks = []

    for page in pages:
        page_number = page["page_number"]
        text = page["text"]

        if not text.strip():
            continue

        page_chunks = text_splitter.split_text(text)

        for chunk_index, chunk_text in enumerate(page_chunks):
            chunks.append(
                {
                    "document_id": document_id,
                    "user_id": user_id,
                    "page_number": page_number,
                    "chunk_index": chunk_index,
                    "text": chunk_text,
                }
            )

    return chunks
