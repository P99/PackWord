<?php
namespace Wrench\Application;

// Base object to fillup rest criteria
// Each resource has an URI
class RestObject
{
  protected $uri = NULL;

  // Save resource location
  public function link($uri) {
    if ($this->uri == NULL) {
      $this->uri = $uri;
      echo "created: {$this->uri}\n";
    }
  }

  // reflect all properties found in data
  function update($data) {
    foreach ($data as $key => $value) {
      if (property_exists($this, $key)) {
        if (is_array($value)) {
          for ($index=0; $index < count($value); $index++) {
            $obj = $this->$key;
            $obj = $obj[$index];
            if (method_exists($obj,"update")) {
              $obj->update($value[$index]);
            }
          }
        } else {
          $this->$key = $value;
          //echo "Reflected: ({$key},{$value})\n";
        }
      }
    }
  }

  // resource was updated
  public function notify() {
    $this->send();
  }
}

?>
