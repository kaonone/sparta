pragma solidity ^0.5.0;

contract CoreInterface {

    /* Module manipulation events */
    event ModuleAdded(address indexed module);
    event ModuleRemoved(address indexed module);
    event ModuleReplaced(address indexed from, address indexed to);


    /* Functions */

    function contains(address _module) view returns (bool);

    function size() view returns (uint);

    function isConstant(mstring _name) view returns (bool);

    function get(string _name) view returns (address);

    function getName(address _module) view returns (string);

    function first() view returns (address);

    function next(address _current) view returns (address);

    function set(string _name, address _module, string _abi, bool _constant);

    function remove(string _name);
}