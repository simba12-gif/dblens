const sql = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100)
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  body TEXT
);

ALTER TABLE posts ADD CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE comments ADD CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id);
ALTER TABLE comments ADD CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id);
`;

fetch('http://localhost:3001/api/schema/parse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'sql', content: sql })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
