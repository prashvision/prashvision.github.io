<?php
session_start();
$dir = "uploads/";
$files = array_diff(scandir($dir), array('.', '..'));

// Delete if admin and request
if (isset($_SESSION["admin"]) && isset($_GET["delete"])) {
    $fileToDelete = basename($_GET["delete"]);
    $path = $dir . $fileToDelete;
    if (file_exists($path)) {
        unlink($path);
        header("Location: gallery.php");
        exit;
    }
}
?>
<!DOCTYPE html>
<html>
<head>
  <title>Art Gallery - PrashVision</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #fafafa;
      margin: 0;
      padding: 20px;
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
      position: relative;
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
  <h2 style="text-align:center;">Art Gallery</h2>
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
        <?php if (isset($_SESSION["admin"])): ?>
          <form method="get" onsubmit="return confirm('Delete this artwork?');">
            <input type="hidden" name="delete" value="<?php echo htmlspecialchars($file); ?>">
            <button class="delete-btn">Delete</button>
          </form>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
  </div>
</body>
</html>