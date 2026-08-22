// =============================================================================
// AI-Powered Personalized Learning Path Generator — Neo4j Graph Schema
// Group BCC06 · Week 3 Sprint · Task 3.2
// =============================================================================

// -----------------------------------------------------------------------------
// Uniqueness Constraints (also create backing indexes automatically)
// -----------------------------------------------------------------------------
CREATE CONSTRAINT course_id_unique IF NOT EXISTS
FOR (c:Course) REQUIRE c.course_id IS UNIQUE;

CREATE CONSTRAINT unit_id_unique IF NOT EXISTS
FOR (u:Unit) REQUIRE u.unit_id IS UNIQUE;

CREATE CONSTRAINT concept_id_unique IF NOT EXISTS
FOR (c:Concept) REQUIRE c.concept_id IS UNIQUE;

CREATE CONSTRAINT chunk_id_unique IF NOT EXISTS
FOR (rc:ResourceChunk) REQUIRE rc.chunk_id IS UNIQUE;

// Existence constraints on properties used for joins back to Postgres.
CREATE CONSTRAINT concept_course_id_exists IF NOT EXISTS
FOR (c:Concept) REQUIRE c.course_id IS NOT NULL;

// -----------------------------------------------------------------------------
// Node Property Indexes (non-unique, for filtered traversal)
// -----------------------------------------------------------------------------
CREATE INDEX concept_title_index IF NOT EXISTS
FOR (c:Concept) ON (c.title);

CREATE INDEX unit_number_index IF NOT EXISTS
FOR (u:Unit) ON (u.unit_number);

// -----------------------------------------------------------------------------
// Node Creation Templates
// -----------------------------------------------------------------------------

// :Course — mirrors Postgres `courses.id` in course_id
MERGE (c:Course {course_id: $course_id})
SET c.title = $title, c.code = $code;

// :Unit — scoped under a course
MERGE (u:Unit {unit_id: $unit_id})
SET u.unit_number = $unit_number, u.title = $unit_title;

// :Concept — mirrors Postgres `concepts.id` in concept_id
MERGE (co:Concept {concept_id: $concept_id})
SET co.title = $title, co.description = $description, co.course_id = $course_id;

// :ResourceChunk — mirrors the deterministic chunk_id shared with the Vector DB
MERGE (rc:ResourceChunk {chunk_id: $chunk_id})
SET rc.resource_id = $resource_id, rc.resource_type = $resource_type, rc.text_preview = $text_preview;

// -----------------------------------------------------------------------------
// Relationship Creation Templates
// -----------------------------------------------------------------------------

// (:Course)-[:HAS_UNIT]->(:Unit)
MATCH (c:Course {course_id: $course_id}), (u:Unit {unit_id: $unit_id})
MERGE (c)-[:HAS_UNIT]->(u);

// (:Unit)-[:CONTAINS]->(:Concept)
MATCH (u:Unit {unit_id: $unit_id}), (co:Concept {concept_id: $concept_id})
MERGE (u)-[:CONTAINS]->(co);

// (:Concept)-[:REQUIRES_PREREQUISITE]->(:Concept)
// Directed edge: (source)-[:REQUIRES_PREREQUISITE]->(prerequisite)
// i.e. "source requires prerequisite to be mastered first."
MATCH (source:Concept {concept_id: $source_concept_id}),
      (prereq:Concept {concept_id: $prerequisite_concept_id})
MERGE (source)-[:REQUIRES_PREREQUISITE]->(prereq);

// (:Concept)-[:EXTRACTED_FROM]->(:ResourceChunk)
MATCH (co:Concept {concept_id: $concept_id}), (rc:ResourceChunk {chunk_id: $chunk_id})
MERGE (co)-[:EXTRACTED_FROM]->(rc);

// -----------------------------------------------------------------------------
// Example Read Queries used by the Path Planning Engine / RAG Assistant
// -----------------------------------------------------------------------------

// Upstream prerequisites (what must be learned BEFORE this concept), transitive.
MATCH (target:Concept {concept_id: $concept_id})-[:REQUIRES_PREREQUISITE*1..5]->(prereq:Concept)
RETURN DISTINCT prereq.concept_id AS concept_id, prereq.title AS title;

// Downstream dependents (what BECOMES unlockable once this concept is mastered).
MATCH (target:Concept {concept_id: $concept_id})<-[:REQUIRES_PREREQUISITE*1..5]-(dependent:Concept)
RETURN DISTINCT dependent.concept_id AS concept_id, dependent.title AS title;

// Grounding context: resource chunks backing a concept, for the RAG Assistant.
MATCH (co:Concept {concept_id: $concept_id})-[:EXTRACTED_FROM]->(rc:ResourceChunk)
RETURN rc.chunk_id AS chunk_id, rc.resource_type AS resource_type, rc.text_preview AS text_preview;

// Topological ordering input for the Path Planning Engine: all prerequisite
// edges within a course, used to build a DAG for topological sort in Python.
MATCH (c:Course {course_id: $course_id})-[:HAS_UNIT]->(:Unit)-[:CONTAINS]->(source:Concept)
OPTIONAL MATCH (source)-[:REQUIRES_PREREQUISITE]->(prereq:Concept)
RETURN source.concept_id AS concept_id, collect(prereq.concept_id) AS prerequisite_ids;
