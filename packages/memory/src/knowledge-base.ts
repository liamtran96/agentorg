/**
 * Namespace-isolated knowledge base with document storage and search.
 * In-memory implementation — will be backed by vector store later.
 */

interface Document {
  docId: string;
  content: string;
}

interface SearchResult {
  docId: string;
  content: string;
}

export class KnowledgeBase {
  private namespaces: Map<string, Map<string, Document>> = new Map();

  /**
   * Add a document to a namespace.
   */
  async add(namespace: string, docId: string, content: string): Promise<void> {
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Map());
    }
    this.namespaces.get(namespace)!.set(docId, { docId, content });
  }

  /**
   * Search documents within a namespace by substring match.
   */
  async search(namespace: string, query: string): Promise<SearchResult[]> {
    const docs = this.namespaces.get(namespace);
    if (!docs) return [];

    const results: SearchResult[] = [];
    for (const doc of docs.values()) {
      if (doc.content.includes(query)) {
        results.push({ docId: doc.docId, content: doc.content });
      }
    }
    return results;
  }

  /**
   * Update an existing document's content.
   */
  async update(namespace: string, docId: string, content: string): Promise<void> {
    const docs = this.namespaces.get(namespace);
    if (docs && docs.has(docId)) {
      docs.set(docId, { docId, content });
    }
  }

  /**
   * Delete a document from a namespace. No-op if not found.
   */
  async delete(namespace: string, docId: string): Promise<void> {
    const docs = this.namespaces.get(namespace);
    if (docs) {
      docs.delete(docId);
    }
  }
}
