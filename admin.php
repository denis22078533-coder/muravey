<?php
include 'db_config.php';

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Ошибка подключения: " . $conn->connect_error);
}

$sql = "SELECT id, product_name, price, quantity, order_date FROM orders ORDER BY order_date DESC";
$result = $conn->query($sql);

echo "<h2>Список заказов кофейни</h2>";
if ($result->num_rows > 0) {
    echo "<table border='1'><tr><th>ID</th><th>Товар</th><th>Цена</th><th>Кол-во</th><th>Дата</th></tr>";
    while($row = $result->fetch_assoc()) {
        echo "<tr><td>".$row["id"]."</td><td>".$row["product_name"]."</td><td>".$row["price"]."</td><td>".$row["quantity"]."</td><td>".$row["order_date"]."</td></tr>";
    }
    echo "</table>";
} else {
    echo "Заказов пока нет";
}
$conn->close();
?>
