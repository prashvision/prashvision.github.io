<?php
session_start();
if (!isset($_SESSION["admin"])) {
    header("Location: admin.php");
    exit;
}

// Handle delete if admin clicked delete
$dir = "uploads/";
if (isset($_GET["delete"])) {
    $fileToDelete = basename($_GET["delete"]);
    $path = $dir . $fileToDelete;
    if (file_exists($path)) {
        unlink($path);
        header("Location: dashboard.php");
        exit;
    }
}

// Get uploaded files
$files = array_diff(scandir($dir), array('.', '..'));
?>
<!DOCTYPE html>
<html>
<head>
  <title>Admin Dashboard - PrashVision</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f4f4;
      padding: 40px;
      text-align: center;
    }
    form {
      background: white;
      padding: 30px;
      border-radius: 10px;
      display: inline-block;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      margin-bottom: 40px;
    }
    input[type="file"] {
      margin: 15px 0;
    }
    button {
      padding: 10px 20px;
      background: black;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    a.logout {
      position: absolute;
      top: 20px;
      right: 30px;
      color: red;
      text-decoration: none;
    }
    .gallery {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
    }
    .card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 10px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      width: 230px;
      text-align: center;
    }
    .card img {
      width: 200px;
      height: 200px;
      object-fit: cover;
      border-radius: 8px;
    }
    .info {
      margin-top: 10px;
      font-size: 14px;
      color: #333;
    }
    .delete-btn {
      margin-top: 8px;
      background: red;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
    }
  </style>
</head>
<body>

<a href="logout.php" class="logout">Logout</a>

<h2>Welcome to Admin Dashboard</h2>
<p>Upload your new artwork here:</p>

<!-- Upload Form -->
<form action="upload.php" method="POST" enctype="multipart/form-data">
  <input type="file" name="image" accept="image/*" required><br>
  <button type="submit">Upload Artwork</button>
</form>

<!-- Gallery Display -->
<h3>Uploaded Artworks</h3>
<div class="gallery">
  <?php foreach ($files as $file): 
    $path = $dir . $file;
    $date = date("d M Y", filemtime($path));
  ?>
    <div class="card">
      <img src="<?php echo $path; ?>" alt="Artwork">
      <div class="info">
        <strong><?php echo htmlspecialchars($file); ?></strong><br>
        <small><?php echo $date; ?></small>
      </div>
      <form method="get" onsubmit="return confirm('Delete this artwork?');">
        <input type="hidden" name="delete" value="<?php echo htmlspecialchars($file); ?>">
        <button class="delete-btn">Delete</button>
      </form>
    </div>
  <?php endforeach; ?>
</div>

</body>
</html>