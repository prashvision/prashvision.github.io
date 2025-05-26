<form action="upload.php" method="POST" enctype="multipart/form-data">
  <input type="text" name="title" placeholder="Artwork Title" required>
  <textarea name="description" placeholder="Description" rows="4" required></textarea>
  <input type="file" name="image" accept="image/*" required>
  <button type="submit">Upload</button>
</form>