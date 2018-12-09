const express = require('express')

const router = express.Router()

const db = require('../../models')

/* GET users listing. */
router.get('/', (req, res, next) => {
  db.formation
    .findAll({
      include: [
        {
          model: db.vehicle_formation,
          required: true,
          include: [
            {
              model: db.vehicle,
              required: true
            }
          ]
        }
      ],
      order: [
        ['formation_number', 'ASC'],
        [db.formation.associations.vehicle_formations, 'car_number', 'ASC']
      ]
    })
    .then(result => {
      res.json(result)
    })
})

module.exports = router
