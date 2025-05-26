<?php
// admin.php - handle admin login
session_start();

$correctPassword = "prashadmin123"; // Change this to your desired password

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    if ($_POST["password"] === $correctPassword) {
        $_SESSION["admin"] = true;
        header("Location: dashboard.php");
        exit;
    } else {
        $error = "Incorrect password!";
    }
}
?>
<!DOCTYPE html>
<html>
<head>
  <title>Admin Login - PrashVision</title>
  <style>
    body { font-family: Arial; background: #f2f2f2; text-align: center; padding: 100px; }
    form { background: white; padding: 30px; display: inline-block; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    input[type="password"] { padding: 10px; width: 200px; margin-bottom: 15px; }
    button { padding: 10px 20px; background: black; color: white; border: none; }
  </style>
</head>
<body>
  <h2>Admin Login</h2>
  <?php if (isset($error)) echo "<p style='color:red;'>$error</p>"; ?>
  <form action="admin.php" method="POST">
    <input type="password" name="password" placeholder="Enter Admin Password" required><br>
    <button type="submit">Login</button>
  </form>
</body>
</html>