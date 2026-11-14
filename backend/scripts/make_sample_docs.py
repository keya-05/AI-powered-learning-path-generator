"""Generate a small synthetic document set for CS201 (Data Structures & Algorithms).

These files exist to exercise the pipeline end to end (ingestion, concept
extraction, prerequisite edges, exam weights, planning). They are written for
this repository and are NOT evaluation data for the paper.

    python -m scripts.make_sample_docs      # writes backend/sample_data/cs201/*.pdf
"""

from pathlib import Path

import fitz  # PyMuPDF

OUT = Path(__file__).resolve().parent.parent / "sample_data" / "cs201"

SYLLABUS = [
    """CS201 Data Structures & Algorithms - Syllabus 2026
Credits: 4. Prerequisite course: Programming in C.

Unit I: Foundations (8 Hours)
Arrays & Complexity, Linked Lists, Binary Search

Unit II: Linear Structures (6 Hours)
Stacks & Queues, Hashing

Unit III: Trees (12 Hours)
Binary Trees, Binary Search Trees, AVL Tree Rotations, Heaps

Unit IV: Graphs (10 Hours)
Graph Traversal, Topological Sort, Shortest Paths

Unit V: Algorithm Design (8 Hours)
DP State Transitions, Knapsack Problems

Text Books
1. Cormen et al., Introduction to Algorithms, 4th ed.
Course Outcomes
CO1 Analyse the complexity of algorithms.""",
]

NOTES = [
    """Unit 1 Notes: Foundations
Arrays & Complexity. An array stores elements in contiguous memory, so indexing is O(1).
Asymptotic notation (big-O, big-Theta) describes how running time grows with input size.

Linked Lists build on arrays & complexity: we compare their O(1) insertion with the O(n)
shifting an array needs. A linked list stores each element in a node with a pointer to
the next node. Linked lists are a prerequisite for stacks & queues implemented with nodes.

Binary Search requires a sorted array and halves the search interval each step, giving
O(log n) time. Binary search assumes knowledge of arrays & complexity.""",
    """Unit 2 Notes: Linear Structures
Stacks & Queues. Building on linked lists, a stack can be implemented with a head pointer
where push and pop are O(1). A queue keeps head and tail pointers.
Applications: expression evaluation, BFS uses a queue.

Hashing maps keys to array indices with a hash function. Hashing builds on arrays & complexity:
collisions are resolved with chaining (a linked list per bucket) or open addressing.""",
    """Unit 3 Notes: Trees
Binary Trees. Building on linked lists, a binary tree node holds two child pointers.
Traversals: inorder, preorder, postorder. Level-order traversal uses stacks & queues.

Binary Search Trees extend binary trees with an ordering invariant: left subtree keys are
smaller, right subtree keys are larger. Searching a binary search tree mirrors binary search.

AVL Tree Rotations. An AVL tree is a binary search tree that stays balanced.
AVL tree rotations assume knowledge of binary search trees: a single or double rotation restores
the balance factor after insertion.

Heaps are complete binary trees stored in an array. Heaps build on binary trees and arrays & complexity.
A binary heap supports insert and extract-min in O(log n).""",
    """Unit 4 Notes: Graphs
Graph Traversal. Breadth-first search uses stacks & queues; depth-first search uses recursion or
an explicit stack. Graph traversal builds on stacks & queues.

Topological Sort orders the vertices of a DAG. Topological sort requires graph traversal:
Kahn's algorithm repeatedly removes vertices of in-degree zero.

Shortest Paths. Dijkstra's algorithm builds on heaps, using a min-priority queue keyed by distance.
Shortest paths also depend on graph traversal.""",
    """Unit 5 Notes: Algorithm Design
DP State Transitions. Dynamic programming defines a state and a recurrence between states.
Memoisation stores the answer to each state in arrays & complexity terms: O(states x transitions).

Knapsack Problems. The 0/1 knapsack problem builds on DP state transitions: the state is
(item index, remaining capacity). Knapsack problems are a classic application of DP state transitions.""",
]

PYQ = [
    """CS201 End Semester Examination 2024. Time: 3 hours. Max marks: 60.
Q1 Explain how a linked list differs from an array for insertion and deletion. (5 marks)
Q2 Show the AVL tree rotations needed after inserting 10, 20, 30, 25 into an empty AVL tree. (10 marks)
Q3 Insert the keys 50, 30, 70, 20, 40 into a binary search tree and give its inorder traversal. (8 marks)
Q4 Write Dijkstra's algorithm and trace shortest paths from vertex A in the given graph. (10 marks)
Q5 Give the recurrence for the 0/1 knapsack problems and fill the table for capacity 5. (10 marks)
Q6 Explain open addressing in hashing with linear probing. (5 marks)
Q7 Perform a topological sort of the given DAG using Kahn's algorithm. (7 marks)
Q8 Define big-O notation and find the complexity of nested loops. (5 marks)""",
]


def write_pdf(path: Path, pages: list[str]) -> None:
    doc = fitz.open()
    for text in pages:
        page = doc.new_page()
        page.insert_textbox(fitz.Rect(56, 56, 540, 790), text, fontsize=10.5, fontname="helv")
    doc.save(path)
    doc.close()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    write_pdf(OUT / "CS201_Sample_Syllabus.pdf", SYLLABUS)
    write_pdf(OUT / "CS201_Sample_Notes.pdf", NOTES)
    write_pdf(OUT / "CS201_Sample_PYQ_2024.pdf", PYQ)
    print(f"Wrote 3 PDFs to {OUT}")


if __name__ == "__main__":
    main()
