<?php
//code from https://github.com/etm/algo-bunny/blob/main/ui/download.php
  header('Access-Control-Allow-Origin: *'); 
  header('Content-type: text/plain');
  ini_set('display_errors', 1);
  error_reporting(E_ALL);

  if ($_REQUEST['url']) {
    $url = $_REQUEST['url'];
    //$encodedUrl = urlencode($url); // Encode the URL
    echo file_get_contents($url);
  } else {
    echo "";
  }
  exit;
?>