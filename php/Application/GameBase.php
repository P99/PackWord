<?php

namespace Wrench\Application;

use Wrench\Application\Application;
use Wrench\Application\NamedApplication;

use Wrench\Application\RestObject;
use Wrench\Application\MFLGame;

class GameBase extends Application
{
  private $clients = array();
  public $games = array();
  
  function __construct() {
    // register each game here
    $this->games[] = new MFLGame();
    echo "created ". get_class($this) ."\n";
    $this->games[0]->link("games/0");
  }
  
  public function onConnect($client) {
    $id = $client->getId();
    $this->clients[$id] = $client;

    // describe game status to beginners
    $this->send();
  }

  public function onDisconnect($client) {
    $id = $client->getId();

    // removing player
    foreach ($this->games as $game) {
      foreach ($game->parties as $party) {
         foreach ($party->players as $index => $player) {
           if ($player->checkClient($client)) {
              unset($party->players[$index]);
           }
         }
      }
    }

    // ToDo remove party if no more players

    unset($this->clients[$id]);

    // update Game status
    $this->send();
  }
  
  // receiving data
  public function onData($data, $client) {
    $id = $client->getId();
    
    $decodedData = json_decode($data, true);
		$uri = $decodedData["action"];
		$data = $decodedData["data"];
    
    // dispatch
    $this->restHandler($uri, $client, $data);

    // remove client from local list
    // ToDo: only upon object creation
    unset ($this->clients[$id]);

    // update game for un-registered players
    $this->send();

  }

  // defaults send to all clients
  public function send() {
    foreach ($this->clients as $client) {
      $data = array('action' => "games", 'data' => $this);
      $client->send( json_encode($data) );
    }
  }

  // split REST url into (key, values) pairs as (resource, instance)
  private function restSplit($uri) {
    $object = array();
    $fragment = NULL;

    // save fragment and discard it from uri
    $pos = strpos($uri, "#");
    if ($pos !== false) {
      $fragment = substr($uri, $pos +1);
      $uri = substr($uri, 0, $pos);
    } 

    $resources = explode("/", $uri);
    for ($i=0; $i<count($resources); $i+=2) {
      if (isset($resources[$i+1])) {
        $object[$resources[$i]] = $resources[$i+1];
      } else {
        $object[$resources[$i]] = "all";
      }
    }

    // creating special 'fragment' property
    if (isset($fragment)) {
      $object["fragment"] = $fragment;
    }

    return $object;
  }

  // join (key, values) pairs as (resource, instance) into a REST based URI
  private function restJoin($array) {
    $uri = "";
    foreach ($array as $key => $value) {
      $uri .= $key . "/" . $value . "/";
    }
    // remove trailing slash
    if (substr($uri, -1) == "/") {
      $uri = substr($uri, 0, -1);
    }
    return $uri;
  }

  // Apply received json data to php Object
  private function restUpdate($obj, $rest, $data_in) {
    $key = end(array_keys($rest));
    $value = end(array_values($rest));
    $data_out = NULL;

    if ($key == "fragment") {
      // pack data
      $data_out = array($value => $data_in);
    } else {
      $name = key($data_in);
      if (is_numeric($value)) {
        // nominal: unpack data
        // check data consistency (firt key must match resource name)
        // but $key is plural wherease first $data element is singular
        $length = strlen($name);
        if ($length > 2) {
          if (!substr_compare($key, $name, 0, $length -1, true) ) {
            $data_out = $data_in[$name];
          } 
        } 
      } else if ($value == "all") {
        // simply check data consistency - exact match
        if (!strcasecmp($key, $name)) {
            $data_out = $data_in;
        } 
      }
    }

    if (isset($data_out) && method_exists($obj,"update")) {
      $obj->update($data_out);
    }
  }

  // Call function for each object in the branch
  private function restCall($function, $array) {
    $obj = $this;
    foreach ($array as $key => $value) {
      if (property_exists($obj, $key) && is_numeric($value)) {
        // numeric value -> jump to child 
        $obj = $obj->$key;
        $obj = $obj[$value];
        if (method_exists($obj, $function)) {
          $obj->$function();
        }
      }
    }
  }

  // Special handler to create new items
  private function restCreate($name, $context) {
    $obj = NULL;
    
    // create
    switch($name) {
      case "parties":
        $obj = new MFLParty($context);
        break;
      case "players":
        $obj = new MFLPlayer($context);
        break;
      default:
        echo "Cannot create object: {$name}\n";
    }
    return $obj;
  }

  // Retreive resource according to URI
  private function restHandler($rest, $context = NULL, $data = NULL) {
    $status = "OK";
    
    // parameter might be an array or simple URI
    if (!is_array($rest)) {
      $rest = $this->restSplit($rest);
    }

    $obj = &$this;
    foreach ($rest as $key => $value) {
      if (property_exists($obj, $key)) {
        if (is_numeric($value)) {
          // numeric value -> jump to child 
          $obj = &$obj->$key;
          $obj = &$obj[$value];
        } elseif ($value == "all") {
          // Automatic ?
        } elseif ($value == "new") {
          // delegate to create object according to type
          $obj = &$obj->$key;
          $obj[] = $this->restCreate($key, $context);
          // update rest context
          $last_index = end(array_keys($obj));
          $obj = &$obj[$last_index];
          $rest[$key] = $last_index;
          $status = "CREATED";
        }
      } else {
        //echo "Undefined variable: {$key}\n";
      }
    }

    // update last resource with new data
    $this->restUpdate($obj, $rest, $data);

    // link upon creation
    if ($status == "CREATED") {
      $obj->link($this->restJoin($rest));
    }

    // notify hierarchy (whole branch)
    $this->restCall("notify", $rest);

    // take appropriate action
    $this->restCall("act", $rest);

    return $status;
  }
  
} // End class GameBase

?>
