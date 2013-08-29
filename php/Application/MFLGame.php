<?php
namespace Application;

use Application\RestObject;

// First game - Mot fleches
// Other games might be registered lateron 
// Each game has several parties
class MFLGame extends RestObject
{
  public $name = "Mot flêché";
  public $parties = array();

  function __construct() {
    echo "created ". get_class($this) ."\n";
  }

  // overload
  public function notify() {}

  function send() {
    $data = array('action' => $this->uri, 'data' => $this);
    // Send all parties
    foreach ( $this->parties as $party) {
      $party->send($data);
    }
  }
}

// Party handle a context with few players
class MFLParty extends RestObject
{
  public $status = "init";
  public $progress = 0; // percent
  public $players = array();
  public $max_players = 4;
  public $grid_size = 13;
  public $colors = array("#e4e599", "#ecb42d", "#f28171", "#cc1c4b", "#ac55a4", "#653040", "#26afa8", "#879444", "#d6d0c0", "#d4bcb0");

  private $cells = array();

  function __construct($client) {
    // Each party has at least one player
    $this->players[] = new MFLPlayer($client);
  }

  // Overload
  public function link($uri) {
    // call original implementation
    parent::link($uri);

    // workaround: Update first child uri here
    if ((count($this->players) == 1) 
          && array_key_exists(0, $this->players)) {
      $this->players[0]->link( $this->uri . "/players/0" );
    }
  }

  // Overload
  function update($data) {
    // Special handling for cells
    if (isset($data["cells"])) {
      $this->validate($data["cells"]);
      $this->sendCells();
    } else {
      parent::update($data);
    }
  }

  // Overload
  function notify() {
    if ($this->status == "init") {

      // Assign default color for each player
      foreach ($this->players as $player) {
        if ($player->color == "white") {
          $player->color = array_pop($this->colors);
        }
      }

      parent::notify();

      // workaround: Notify first player here
      if ((count($this->players) == 1)  
            && array_key_exists(0, $this->players)) {
        $this->players[0]->notify();
      }
    }
  }

  // Take action according to new events
  public function act() {
    $nb_players = count($this->players);

    switch ($this->status) {
      case "init":
        if ($nb_players == $this->max_players) {
          // we reached max players
          // requesting status update
          foreach ( $this->players as $player) {
            $player->sendProperty("status");
            $this->status = "join";
          }
        }
        break;
      case "join":
        if ($nb_players == $this->max_players) {
          $nb_players_ready = 0;
          foreach ( $this->players as $player) {
            if ($player->status == "ready") {
              $nb_players_ready ++;
            }
          }
          if ($nb_players_ready == $this->max_players) {
            echo $this->uri . " -> $nb_players_ready players ready\n";
            $this->status = "play";
            $this->send();
            // update grid
            $this->loadCells();
            $this->sendCells();
          }
        }
        break;
      case "play":
        break;
      default:
        echo "Undefined Party state: {$this->status}\n";
    }
  }

  function send($data = NULL) {
    if (is_null($data)) {
      $data = array('action' => $this->uri, 'data' => $this);
    }
    // Send all players
    foreach ( $this->players as $player) {
      $player->send($data);
    }
  }

  // Load a grid file and update local context
  private function loadCells() {
    $cells = array();
    $cells_idx = 0;
    $captions = array();
    $captions_idx = 0;

    $grid = array();

    $filename = dirname ( __FILE__ ) . "/data/mfl1.mfl";
    $file = fopen($filename, "r");
    $data = fread($file, filesize($filename));
    fclose($file);

    // Dump params into associative array
    parse_str($data, $output);
    foreach ($output as $key => $value) {
      if ( strstr($key, "lign") ) {
        foreach( str_split($value) as $letter ) {
          $cells[$cells_idx] = $letter;
          $cells_idx++;
        }     
      } elseif ( strstr($key, "tx") ) {
        $captions[$captions_idx] = $value;
        $captions_idx++;
      }
    }

    $captions_idx = 0;
    foreach ($cells as $key => $value) {
      if ( $value == "z") {
        $grid[$key] = array("type" => "empty");
      }
      elseif ( ctype_lower($value) ) {
        $nb_captions = ($value > "e") ? 2 : 1;
        $cell_captions = array_slice($captions, $captions_idx, $nb_captions);
        $captions_idx += $nb_captions;
        $grid[$key] = array("type" => "caption", "tx" => $value, "captions" => $cell_captions);
      }
      else {
        $grid[$key] = array("type" => "letter", "tx" => $value, "status" => "empty");
      }
			
    }

    $this->cells = $grid;
  }

  // Utility filter functions
  private function caption_filter($e) { return (strpos("caption empty", $e["type"]) !== false);}
  private function found_filter($e) { return (isset($e["status"]) && ($e["status"] == "found"));}

  function sendCells() {
    static $count = 0;

    $filter = array( $this, $count ? "found_filter" : "caption_filter");
    $caption_cells = array_filter($this->cells, $filter );

    if (count($caption_cells) > 0) {
      $data = array('action' => $this->uri . "/cells", 'data' => array( "cells" => $caption_cells));

      // Send all players
      foreach ( $this->players as $player) {
        $player->send($data);
      }
    }

    $count++;
  }

  private function canMove($in, $dir) {
    $out = false;
    switch($dir) {
      case "left":
        if ($in % $this->grid_size > 0) {
          $out = $in -1;
        }
        break;
      case "right":
        if ($in % $this->grid_size < $this->grid_size -1) {
          $out = $in +1;
        }
        break;
      case "up":
        if ($in > $this->grid_size) {
          $out = $in - $this->grid_size;
        }
        break;
      case "down":
        if ($in < ($this->grid_size * ($this->grid_size-1))) {
          $out = $in + $this->grid_size;
        }
        break;
    }
    if ( !isset($this->cells[$out]) || $this->cells[$out]["type"] != "letter") {
      $out = false;
    }
    return $out;
  }
  
  // validate helper
  private function validateRecursive($id, &$cells, $directions = array("left", "right", "up", "down"), &$length = 0) {

    $length++;
    if ($length > 500) die("killed\n");
    
    if ( ($this->cells[$id]["status"] == "found") 
      || ( isset($cells[$id]) && ($this->cells[$id]["tx"] == $cells[$id]["tx"]) ) ) {
      
      $check = true;
      $array = array_chunk($directions, ceil(count($directions) / 2)); // dichotomize directions
      do {
        $directions = array_shift($array);
        if (isset($directions)) {
          $next = $id;
          if (count($directions) == 1) {
            $next = $this->canMove($id, $directions[0]);
          } 
          if ($next !== false) {
            $check = $this->validateRecursive($next, $cells, $directions, $length);
          }
          if ((count($directions) > 1) && ($check === false)) {
            // continue with vertical check
            $length = 1;
            $check = true;
          }
        } 
      } while ($check && $directions);
      
      // Update global grid with new found cells
      if ($check && isset($cells[$id]) && ($length > 2)) {
        $this->cells[$id]["color"] = $cells[$id]["color"];
        $this->cells[$id]["status"] = "found";
        unset($cells[$id]);
      }
      
    } else {
      $check = false;
    }
    
    return $check;
  }
  
  // validate new cells sent by the player
  function validate($cells) {
    $check = false;
    //echo "validate: {". join(array_keys($cells), ", ") . "}\n";
    while (count($cells)) {
      $id = key($cells);
      $check = $this->validateRecursive($id, $cells);
      if (isset($cells[$id])) {
        unset($cells[$id]);
      }
      //echo "Checking cell {$id} returned {$check} (". count($cells) ." cells left)\n";
    }
    return $check;
  }

}

// Local context for each player
// Each player has a websocket client adn can send data
class MFLPlayer extends RestObject
{
  public $name = "palou";
  public $color = "white";
  public $status = "free";

  private $client = NULL;

  function __construct($client) {
    $this->client = $client;
  }

  function __destruct() {
    echo "[deleted] {$this->uri}\n";
  }

  function send($data = NULL) {
    if (is_null($data)) {
      $data = array('action' => $this->uri, 'data' => $this);
    }
    $this->client->send( json_encode($data) );
  }

  function sendProperty($property) {
    if (property_exists($this, $property)) {
      $uri = $this->uri ."#". $property;
      $data = array('action' => $uri, 'data' => $this->$property);
      $this->client->send( json_encode($data) );
    }
  }

  function checkClient($client) {
    return ($client === $this->client);
  }

}

?>

